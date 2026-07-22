import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { db } from './src/db/index.ts';
import { homes, users, sections, videos, quizQuestions, userProgress } from './src/db/schema.ts';
import { eq, and, sql, asc } from 'drizzle-orm';
import { requireAuth, requireAdmin, AuthRequest } from './src/middleware/auth.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // API HEALTH CHECK
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ----------------------------------------------------
  // HOMES ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/homes', async (req, res) => {
    try {
      const allHomes = await db.select().from(homes).orderBy(asc(homes.id));
      res.json(allHomes);
    } catch (err: any) {
      console.error('Error fetching homes:', err);
      res.status(500).json({ error: 'Failed to fetch homes' });
    }
  });

  app.post('/api/homes', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { name, code } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Home name is required' });
      }
      const homeCode = code || name.substring(0, 5).toUpperCase();
      const [newHome] = await db
        .insert(homes)
        .values({ name, code: homeCode })
        .returning();
      res.status(201).json(newHome);
    } catch (err: any) {
      console.error('Error creating home:', err);
      res.status(500).json({ error: err.message || 'Failed to create home' });
    }
  });

  // ----------------------------------------------------
  // AUTHENTICATION & OTP RECOVERY ENDPOINTS
  // ----------------------------------------------------
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, username, homeId, role } = req.body;

      if (!email || !username) {
        return res.status(400).json({ error: 'Email and username are required' });
      }

      // Find user matching email and username
      const [user] = await db
        .select({
          id: users.id,
          uid: users.uid,
          email: users.email,
          username: users.username,
          role: users.role,
          homeId: users.homeId,
          homeName: homes.name,
        })
        .from(users)
        .leftJoin(homes, eq(users.homeId, homes.id))
        .where(
          and(
            sql`LOWER(${users.email}) = LOWER(${email})`,
            sql`LOWER(${users.username}) = LOWER(${username})`
          )
        );

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials. User with this email and username was not found.',
        });
      }

      // Check role if specified
      if (role && user.role !== role) {
        return res.status(403).json({
          error: `Access Denied: Account role is '${user.role}', not '${role}'.`,
        });
      }

      // Check Home Verification: Staff cannot enter a home where they are not assigned!
      if (user.role === 'staff' && homeId) {
        if (user.homeId !== parseInt(homeId, 10)) {
          return res.status(403).json({
            error: `Access Denied: You are registered at '${user.homeName || 'another location'}'. You cannot log in to this location without authorization.`,
          });
        }
      }

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          username: user.username,
          role: user.role,
          homeId: user.homeId,
          homeName: user.homeName,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'An error occurred during login' });
    }
  });

  // Request OTP for password/email retrieval
  app.post('/api/auth/request-otp', async (req, res) => {
    try {
      const { email, username } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (!user) {
        return res.status(404).json({ error: 'No account found with this email' });
      }

      // Generate 6 digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      await db
        .update(users)
        .set({ otpCode, otpExpiresAt })
        .where(eq(users.id, user.id));

      res.json({
        message: 'OTP generated successfully',
        otpCode, // Returned for staff retrieval
        username: user.username,
        email: user.email,
      });
    } catch (err: any) {
      console.error('OTP request error:', err);
      res.status(500).json({ error: 'Failed to generate OTP' });
    }
  });

  // Verify OTP and reset credentials or retrieve details
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { email, otpCode, newPassword } = req.body;
      if (!email || !otpCode) {
        return res.status(400).json({ error: 'Email and OTP code are required' });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (!user) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (!user.otpCode || user.otpCode !== otpCode) {
        return res.status(400).json({ error: 'Invalid OTP code' });
      }

      if (user.otpExpiresAt && new Date(user.otpExpiresAt) < new Date()) {
        return res.status(400).json({ error: 'OTP code has expired' });
      }

      if (newPassword) {
        await db
          .update(users)
          .set({ passwordHash: newPassword, otpCode: null, otpExpiresAt: null })
          .where(eq(users.id, user.id));
      }

      res.json({
        message: 'OTP verified successfully. Account recovered.',
        username: user.username,
        email: user.email,
      });
    } catch (err: any) {
      console.error('OTP verify error:', err);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  });

  // Current session user details
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // ----------------------------------------------------
  // SECTIONS & VIDEOS ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/sections', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      const allSections = await db.select().from(sections).orderBy(asc(sections.orderNum));
      const allVideos = await db.select().from(videos).orderBy(asc(videos.orderNum));
      const allProgress = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, userId));

      const progressMap = new Map(allProgress.map((p) => [p.videoId, p]));

      // Format response with video progress
      const result = allSections.map((sec) => {
        const sectionVideos = allVideos
          .filter((v) => v.sectionId === sec.id)
          .map((vid) => {
            const p = progressMap.get(vid.id);
            return {
              ...vid,
              percentage: p?.percentage || 0,
              watchedFinished: p?.watchedFinished || false,
              quizCompleted: p?.quizCompleted || false,
              quizScore: p?.quizScore || 0,
              passed: p?.passed || false,
            };
          });

        return {
          ...sec,
          videos: sectionVideos,
        };
      });

      res.json(result);
    } catch (err: any) {
      console.error('Error fetching sections:', err);
      res.status(500).json({ error: 'Failed to fetch sections' });
    }
  });

  app.post('/api/sections', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Section title is required' });
      }

      const [maxOrd] = await db
        .select({ max: sql<number>`COALESCE(MAX(${sections.orderNum}), 0)` })
        .from(sections);

      const [newSec] = await db
        .insert(sections)
        .values({
          title,
          description: description || '',
          orderNum: (maxOrd?.max || 0) + 1,
        })
        .returning();

      res.status(201).json(newSec);
    } catch (err: any) {
      console.error('Error creating section:', err);
      res.status(500).json({ error: 'Failed to create section' });
    }
  });

  app.put('/api/sections/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const sectionId = parseInt(req.params.id, 10);
      const { title, description } = req.body;

      const [updated] = await db
        .update(sections)
        .set({ title, description })
        .where(eq(sections.id, sectionId))
        .returning();

      res.json(updated);
    } catch (err: any) {
      console.error('Error updating section:', err);
      res.status(500).json({ error: 'Failed to update section' });
    }
  });

  app.delete('/api/sections/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const sectionId = parseInt(req.params.id, 10);
      await db.delete(sections).where(eq(sections.id, sectionId));
      res.json({ message: 'Section deleted successfully' });
    } catch (err: any) {
      console.error('Error deleting section:', err);
      res.status(500).json({ error: 'Failed to delete section' });
    }
  });

  // Fetch video details and its quiz questions
  app.get('/api/videos/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const videoId = parseInt(req.params.id, 10);
      const userId = req.user!.id;

      const [vid] = await db.select().from(videos).where(eq(videos.id, videoId));
      if (!vid) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const questions = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.videoId, videoId))
        .orderBy(asc(quizQuestions.id));

      const [prog] = await db
        .select()
        .from(userProgress)
        .where(
          and(eq(userProgress.userId, userId), eq(userProgress.videoId, videoId))
        );

      res.json({
        ...vid,
        quizQuestions: questions,
        progress: prog || {
          percentage: 0,
          watchedFinished: false,
          quizCompleted: false,
          quizScore: 0,
          passed: false,
        },
      });
    } catch (err: any) {
      console.error('Error fetching video:', err);
      res.status(500).json({ error: 'Failed to fetch video details' });
    }
  });

  // Admin add video with 3 quiz questions
  app.post('/api/videos', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { sectionId, title, description, url, durationSeconds, questions } = req.body;

      if (!sectionId || !title || !url) {
        return res.status(400).json({ error: 'Section ID, title, and video URL are required' });
      }

      const [maxOrd] = await db
        .select({ max: sql<number>`COALESCE(MAX(${videos.orderNum}), 0)` })
        .from(videos)
        .where(eq(videos.sectionId, sectionId));

      const [newVid] = await db
        .insert(videos)
        .values({
          sectionId,
          title,
          description: description || '',
          url,
          durationSeconds: durationSeconds || 180,
          orderNum: (maxOrd?.max || 0) + 1,
        })
        .returning();

      if (Array.isArray(questions) && questions.length > 0) {
        for (const q of questions) {
          await db.insert(quizQuestions).values({
            videoId: newVid.id,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation || '',
          });
        }
      }

      res.status(201).json(newVid);
    } catch (err: any) {
      console.error('Error creating video:', err);
      res.status(500).json({ error: 'Failed to create video' });
    }
  });

  app.delete('/api/videos/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id, 10);
      await db.delete(quizQuestions).where(eq(quizQuestions.videoId, videoId));
      await db.delete(userProgress).where(eq(userProgress.videoId, videoId));
      await db.delete(videos).where(eq(videos.id, videoId));
      res.json({ message: 'Video deleted successfully' });
    } catch (err: any) {
      console.error('Error deleting video:', err);
      res.status(500).json({ error: 'Failed to delete video' });
    }
  });

  // ----------------------------------------------------
  // PROGRESS TRACKING & QUIZ EVALUATION
  // ----------------------------------------------------
  app.post('/api/progress/watch', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { videoId, percentage } = req.body;

      if (!videoId || percentage === undefined) {
        return res.status(400).json({ error: 'Video ID and percentage are required' });
      }

      const pct = Math.min(100, Math.max(0, Math.round(percentage)));
      const watchedFinished = pct >= 95; // 95%+ constitutes finished watching

      const [existing] = await db
        .select()
        .from(userProgress)
        .where(
          and(eq(userProgress.userId, userId), eq(userProgress.videoId, videoId))
        );

      if (existing) {
        const newPct = Math.max(existing.percentage, pct);
        const newFinished = existing.watchedFinished || watchedFinished;

        const [updated] = await db
          .update(userProgress)
          .set({
            percentage: newPct,
            watchedFinished: newFinished,
            updatedAt: new Date(),
          })
          .where(eq(userProgress.id, existing.id))
          .returning();

        return res.json(updated);
      } else {
        const [inserted] = await db
          .insert(userProgress)
          .values({
            userId,
            videoId,
            percentage: pct,
            watchedFinished,
            quizCompleted: false,
            quizScore: 0,
            passed: false,
          })
          .returning();

        return res.json(inserted);
      }
    } catch (err: any) {
      console.error('Error updating watch progress:', err);
      res.status(500).json({ error: 'Failed to save progress' });
    }
  });

  // Submit quiz answers
  app.post('/api/progress/quiz', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { videoId, answers } = req.body; // array of selected option indices e.g. [1, 1, 1]

      if (!videoId || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Video ID and answers array are required' });
      }

      // Check if user finished video first
      const [prog] = await db
        .select()
        .from(userProgress)
        .where(
          and(eq(userProgress.userId, userId), eq(userProgress.videoId, videoId))
        );

      if (!prog || !prog.watchedFinished) {
        return res.status(400).json({
          error: 'You must complete watching the video before taking the quiz!',
        });
      }

      const questions = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.videoId, videoId))
        .orderBy(asc(quizQuestions.id));

      if (questions.length === 0) {
        return res.status(400).json({ error: 'No quiz questions available for this video' });
      }

      let score = 0;
      const questionResults = questions.map((q, idx) => {
        const userChoice = answers[idx];
        const isCorrect = userChoice === q.correctIndex;
        if (isCorrect) score++;
        return {
          questionId: q.id,
          question: q.question,
          userChoice,
          correctIndex: q.correctIndex,
          isCorrect,
          explanation: q.explanation,
        };
      });

      const totalQuestions = questions.length;
      const passed = score >= 2; // Must get at least 2/3 to pass and move forward!

      const [updatedProg] = await db
        .update(userProgress)
        .set({
          quizCompleted: true,
          quizScore: score,
          passed: passed || prog.passed,
          updatedAt: new Date(),
        })
        .where(eq(userProgress.id, prog.id))
        .returning();

      res.json({
        score,
        total: totalQuestions,
        passed,
        message: passed
          ? 'Congratulations! You passed the quiz (at least 2/3 required). Next section unlocked!'
          : `You scored ${score}/${totalQuestions}. You must score at least 2 out of 3 to pass and proceed. Please review the video and try again!`,
        questionResults,
        progress: updatedProg,
      });
    } catch (err: any) {
      console.error('Error submitting quiz:', err);
      res.status(500).json({ error: 'Failed to process quiz submission' });
    }
  });

  // ----------------------------------------------------
  // ADMIN REPORTS & USER MANAGEMENT ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          uid: users.uid,
          email: users.email,
          username: users.username,
          role: users.role,
          homeId: users.homeId,
          homeName: homes.name,
          otpCode: users.otpCode,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(homes, eq(users.homeId, homes.id))
        .orderBy(asc(users.id));

      res.json(allUsers);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { email, username, role, homeId, password } = req.body;

      if (!email || !username) {
        return res.status(400).json({ error: 'Email and username are required' });
      }

      const customUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const [newUser] = await db
        .insert(users)
        .values({
          uid: customUid,
          email,
          username,
          role: role || 'staff',
          homeId: homeId ? parseInt(homeId, 10) : null,
          passwordHash: password || 'staff123',
        })
        .returning();

      res.status(201).json(newUser);
    } catch (err: any) {
      console.error('Error creating user:', err);
      res.status(500).json({ error: err.message || 'Failed to create user' });
    }
  });

  app.put('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { email, username, role, homeId, password } = req.body;

      const updateData: any = {};
      if (email) updateData.email = email;
      if (username) updateData.username = username;
      if (role) updateData.role = role;
      if (homeId !== undefined) updateData.homeId = homeId ? parseInt(homeId, 10) : null;
      if (password) updateData.passwordHash = password;

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      res.json(updated);
    } catch (err: any) {
      console.error('Error updating user:', err);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (req.user && userId === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own active admin account!' });
      }
      await db.delete(userProgress).where(eq(userProgress.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      res.json({ message: 'User deleted successfully' });
    } catch (err: any) {
      console.error('Error deleting user:', err);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Admin completion report across all staff and homes
  app.get('/api/admin/reports', requireAuth, requireAdmin, async (req, res) => {
    try {
      const staffMembers = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          homeName: homes.name,
        })
        .from(users)
        .leftJoin(homes, eq(users.homeId, homes.id))
        .where(eq(users.role, 'staff'));

      const allVids = await db.select().from(videos);
      const allProg = await db.select().from(userProgress);

      const reports = staffMembers.map((st) => {
        const userProgs = allProg.filter((p) => p.userId === st.id);
        const completedVideos = userProgs.filter((p) => p.passed).length;
        const totalVideos = allVids.length;
        const overallPercentage = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

        return {
          userId: st.id,
          username: st.username,
          email: st.email,
          homeName: st.homeName || 'Unassigned',
          completedVideos,
          totalVideos,
          overallPercentage,
          progressDetails: userProgs,
        };
      });

      res.json(reports);
    } catch (err: any) {
      console.error('Error generating report:', err);
      res.status(500).json({ error: 'Failed to generate progress report' });
    }
  });

  // ----------------------------------------------------
  // VITE MIDDLEWARE FOR SERVING FRONTEND & PRODUCTION
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
