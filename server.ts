import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import {
  db,
  checkDatabaseConnection,
  closeDatabasePool,
} from "./src/db/index.ts";
import {
  homes,
  users,
  sections,
  videos,
  quizQuestions,
  userProgress,
} from "./src/db/schema.ts";
import { eq, and, sql, asc } from "drizzle-orm";
import {
  requireAuth,
  requireAdmin,
  AuthRequest,
} from "./src/middleware/auth.ts";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  createPasswordChangeToken,
  verifyPasswordChangeToken,
} from "./src/lib/session.ts";
import {
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
} from "./src/lib/password.ts";
import { sendOtpEmail, EmailNotConfiguredError } from "./src/lib/mailer.ts";

dotenv.config({ quiet: true });

// A database connection failure surfaces very differently depending on the
// driver/OS (ECONNREFUSED, ENOTFOUND, auth failures, etc). Centralizing the
// classification keeps every route's catch block honest: log the real error,
// but only ever send the client a safe, generic message.
function isDatabaseConnectivityError(err: any): boolean {
  // Drizzle wraps the underlying pg/network error in its own error with the
  // real one on `.cause` — check both so the classification survives that
  // wrapping instead of silently falling through to a generic 500.
  const code = err?.code || err?.cause?.code;
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "28P01" || // invalid password
    code === "3D000" || // database does not exist
    code === "28000" // invalid authorization
  );
}

function sendServerError(res: express.Response, err: any, context: string) {
  console.error(`[${context}]`, err?.message || err);
  if (isDatabaseConnectivityError(err)) {
    return res.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message:
          "The service is temporarily unavailable. Please try again shortly.",
      },
    });
  }
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message:
        "Something went wrong. Please try again or contact an administrator.",
    },
  });
}

async function ensureDefaultHomes() {
  try {
    const existingHomes = await db
      .select({ id: homes.id, name: homes.name, code: homes.code })
      .from(homes)
      .orderBy(asc(homes.id));

    const desiredHomes = [
      { name: "Hasset Group Home", code: "HGH" },
      { name: "Hope Group Home", code: "HOGH" },
    ];

    const legacyHome = existingHomes.find((home) => {
      const name = home.name.toLowerCase();
      return (
        name.includes("main location") ||
        name.includes("main") ||
        home.code.toLowerCase() === "main"
      );
    });

    if (existingHomes.length === 0) {
      await db.insert(homes).values(desiredHomes);
      return;
    }

    const hasHasset = existingHomes.some(
      (home) => home.name.toLowerCase() === "hasset group home",
    );
    const hasHope = existingHomes.some(
      (home) => home.name.toLowerCase() === "hope group home",
    );

    if (!hasHasset && legacyHome) {
      await db
        .update(homes)
        .set({ name: "Hasset Group Home", code: "HGH" })
        .where(eq(homes.id, legacyHome.id));
    } else if (!hasHasset) {
      await db.insert(homes).values({ name: "Hasset Group Home", code: "HGH" });
    }

    if (!hasHope) {
      const fallbackHome = existingHomes.find(
        (home) =>
          home.id !== legacyHome?.id &&
          home.name.toLowerCase() !== "hasset group home",
      );
      if (fallbackHome) {
        await db
          .update(homes)
          .set({ name: "Hope Group Home", code: "HOGH" })
          .where(eq(homes.id, fallbackHome.id));
      } else {
        await db
          .insert(homes)
          .values({ name: "Hope Group Home", code: "HOGH" });
      }
    }
  } catch (err: any) {
    console.error("[ensureDefaultHomes]", err?.message || err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  // API HEALTH CHECK
  app.get("/api/health", async (req, res) => {
    const dbStatus = await checkDatabaseConnection();
    res.json({
      status: dbStatus.ok ? "ok" : "degraded",
      database: dbStatus.ok ? "connected" : "unavailable",
      timestamp: new Date().toISOString(),
    });
  });

  // ----------------------------------------------------
  // HOMES ENDPOINTS
  // ----------------------------------------------------
  await ensureDefaultHomes();

  app.get("/api/homes", async (req, res) => {
    try {
      const allHomes = await db.select().from(homes).orderBy(asc(homes.id));
      const visibleHomes = allHomes.filter((home) => {
        const name = home.name.toLowerCase();
        return (
          !name.includes("main location") &&
          !name.includes("main") &&
          home.code.toLowerCase() !== "main"
        );
      });
      res.json(visibleHomes);
    } catch (err: any) {
      sendServerError(res, err, "Error fetching homes");
    }
  });

  app.post("/api/homes", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { name, code } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Home name is required" });
      }
      const homeCode = code || name.substring(0, 5).toUpperCase();
      const [newHome] = await db
        .insert(homes)
        .values({ name, code: homeCode })
        .returning();
      res.status(201).json(newHome);
    } catch (err: any) {
      sendServerError(res, err, "Error creating home");
    }
  });

  // ----------------------------------------------------
  // AUTHENTICATION & OTP RECOVERY ENDPOINTS
  // ----------------------------------------------------
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password, homeId, role } = req.body;

      if (!identifier || !password) {
        return res
          .status(400)
          .json({ error: "Email/username and password are required" });
      }

      // Find user matching email OR username
      const [user] = await db
        .select({
          id: users.id,
          uid: users.uid,
          email: users.email,
          username: users.username,
          role: users.role,
          homeId: users.homeId,
          homeName: homes.name,
          passwordHash: users.passwordHash,
          mustChangePassword: users.mustChangePassword,
        })
        .from(users)
        .leftJoin(homes, eq(users.homeId, homes.id))
        .where(
          sql`LOWER(${users.email}) = LOWER(${identifier}) OR LOWER(${users.username}) = LOWER(${identifier})`,
        );

      // Always run a bcrypt comparison, even for an unknown user, against a
      // fixed dummy hash — otherwise a missing account short-circuits before
      // hashing while a wrong password takes the full bcrypt round-trip,
      // letting an attacker time-distinguish valid emails/usernames.
      const passwordOk = await verifyPassword(
        password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      );

      if (!user || !passwordOk) {
        return res.status(401).json({
          error:
            "Invalid credentials. Please check your email/username and password.",
        });
      }

      // Check role if specified
      if (role && user.role !== role) {
        return res.status(403).json({
          error: `Access Denied: Account role is '${user.role}', not '${role}'.`,
        });
      }

      // Check Home Verification: Staff cannot enter a home where they are not assigned!
      if (user.role === "staff" && homeId) {
        if (user.homeId !== parseInt(homeId, 10)) {
          return res.status(403).json({
            error: `Access Denied: You are registered at '${user.homeName || "another location"}'. You cannot log in to this location without authorization.`,
          });
        }
      }

      // An admin-set initial password must be changed before the account
      // gets a real session — hand back a short-lived, single-purpose token
      // instead of logging them in.
      if (user.mustChangePassword) {
        const changeToken = createPasswordChangeToken(user.id);
        return res.json({
          requiresPasswordChange: true,
          changeToken,
          message:
            "Your password was set by an administrator. Please choose a new password to continue.",
        });
      }

      // Issue a signed, httpOnly session cookie. Downstream requests are
      // authenticated from this cookie server-side — the client never gets
      // to assert its own user id again after this point.
      const sessionToken = createSessionToken(user.id);
      res.cookie(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());

      res.json({
        message: "Login successful",
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
      sendServerError(res, err, "auth/login");
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    res.json({ message: "Logged out successfully" });
  });

  // Completes the forced first-login password change. Requires the
  // short-lived changeToken issued by /api/auth/login, not a session cookie
  // — the account isn't fully logged in until this succeeds.
  app.post("/api/auth/set-initial-password", async (req, res) => {
    try {
      const { changeToken, newPassword } = req.body;
      if (!changeToken || !newPassword) {
        return res
          .status(400)
          .json({ error: "A change token and new password are required" });
      }
      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: "New password must be at least 8 characters" });
      }

      const userId = verifyPasswordChangeToken(changeToken);
      if (userId === null) {
        return res
          .status(401)
          .json({
            error:
              "This password-change link has expired. Please log in again.",
          });
      }

      const newPasswordHash = await hashPassword(newPassword);
      const [updated] = await db
        .update(users)
        .set({ passwordHash: newPasswordHash, mustChangePassword: false })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          uid: users.uid,
          email: users.email,
          username: users.username,
          role: users.role,
          homeId: users.homeId,
        });

      if (!updated) {
        return res.status(401).json({ error: "Account not found" });
      }

      // Password is set — log them in for real now.
      const sessionToken = createSessionToken(updated.id);
      res.cookie(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());

      res.json({ message: "Password set successfully", user: updated });
    } catch (err: any) {
      sendServerError(res, err, "auth/set-initial-password");
    }
  });

  // Request a password-reset OTP. Always responds with the same generic
  // message whether or not the email is registered, so this endpoint can't
  // be used to enumerate valid accounts.
  app.post("/api/auth/request-otp", async (req, res) => {
    const genericResponse = {
      message:
        "If an account exists for that email, a verification code has been sent to it.",
    };

    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (!user) {
        return res.json(genericResponse);
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      try {
        await sendOtpEmail(user.email, otpCode);
      } catch (mailErr: any) {
        if (mailErr instanceof EmailNotConfiguredError) {
          console.error(
            "[auth/request-otp] Email is not configured:",
            mailErr.message,
          );
          return res.status(503).json({
            error: {
              code: "EMAIL_UNAVAILABLE",
              message:
                "Password reset emails are not available right now. Please contact an administrator.",
            },
          });
        }
        throw mailErr;
      }

      // Only persist the OTP once the email actually went out, so a failed
      // send never leaves a valid-but-undelivered code sitting in the DB.
      await db
        .update(users)
        .set({ otpCode, otpExpiresAt })
        .where(eq(users.id, user.id));

      res.json(genericResponse);
    } catch (err: any) {
      sendServerError(res, err, "OTP request error");
    }
  });

  // Verify an emailed OTP and set a new password.
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otpCode, newPassword } = req.body;
      if (!email || !otpCode || !newPassword) {
        return res
          .status(400)
          .json({ error: "Email, OTP code, and a new password are required" });
      }
      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: "New password must be at least 8 characters" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (!user) {
        return res
          .status(400)
          .json({ error: "Invalid or expired verification code" });
      }

      if (!user.otpCode || user.otpCode !== otpCode) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      if (user.otpExpiresAt && new Date(user.otpExpiresAt) < new Date()) {
        return res.status(400).json({ error: "Verification code has expired" });
      }

      const newPasswordHash = await hashPassword(newPassword);
      await db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          otpCode: null,
          otpExpiresAt: null,
        })
        .where(eq(users.id, user.id));

      res.json({
        message:
          "Password reset successfully. You can now log in with your new password.",
        username: user.username,
        email: user.email,
      });
    } catch (err: any) {
      sendServerError(res, err, "OTP verify error");
    }
  });

  // Current session user details
  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // ----------------------------------------------------
  // SECTIONS & VIDEOS ENDPOINTS
  // ----------------------------------------------------
  app.get("/api/sections", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      const allSections = await db
        .select()
        .from(sections)
        .orderBy(asc(sections.orderNum));
      const allVideos = await db
        .select()
        .from(videos)
        .orderBy(asc(videos.orderNum));
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
      sendServerError(res, err, "Error fetching sections");
    }
  });

  app.post("/api/sections", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Section title is required" });
      }

      const [maxOrd] = await db
        .select({ max: sql<number>`COALESCE(MAX(${sections.orderNum}), 0)` })
        .from(sections);

      const [newSec] = await db
        .insert(sections)
        .values({
          title,
          description: description || "",
          orderNum: (maxOrd?.max || 0) + 1,
        })
        .returning();

      res.status(201).json(newSec);
    } catch (err: any) {
      sendServerError(res, err, "Error creating section");
    }
  });

  app.put("/api/sections/:id", requireAuth, requireAdmin, async (req, res) => {
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
      sendServerError(res, err, "Error updating section");
    }
  });

  app.delete(
    "/api/sections/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const sectionId = parseInt(req.params.id, 10);
        await db.delete(sections).where(eq(sections.id, sectionId));
        res.json({ message: "Section deleted successfully" });
      } catch (err: any) {
        sendServerError(res, err, "Error deleting section");
      }
    },
  );

  // Fetch video details and its quiz questions
  app.get("/api/videos/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const videoId = parseInt(req.params.id, 10);
      const userId = req.user!.id;

      const [vid] = await db
        .select()
        .from(videos)
        .where(eq(videos.id, videoId));
      if (!vid) {
        return res.status(404).json({ error: "Video not found" });
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
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.videoId, videoId),
          ),
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
      sendServerError(res, err, "Error fetching video");
    }
  });

  // Admin add video with 3 quiz questions
  app.post("/api/videos", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { sectionId, title, description, url, durationSeconds, questions } =
        req.body;

      if (!sectionId || !title || !url) {
        return res
          .status(400)
          .json({ error: "Section ID, title, and video URL are required" });
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
          description: description || "",
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
            explanation: q.explanation || "",
          });
        }
      }

      res.status(201).json(newVid);
    } catch (err: any) {
      sendServerError(res, err, "Error creating video");
    }
  });

  app.delete("/api/videos/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id, 10);
      await db.delete(quizQuestions).where(eq(quizQuestions.videoId, videoId));
      await db.delete(userProgress).where(eq(userProgress.videoId, videoId));
      await db.delete(videos).where(eq(videos.id, videoId));
      res.json({ message: "Video deleted successfully" });
    } catch (err: any) {
      sendServerError(res, err, "Error deleting video");
    }
  });

  // ----------------------------------------------------
  // PROGRESS TRACKING & QUIZ EVALUATION
  // ----------------------------------------------------
  app.post(
    "/api/progress/watch",
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const { videoId, percentage } = req.body;

        if (!videoId || percentage === undefined) {
          return res
            .status(400)
            .json({ error: "Video ID and percentage are required" });
        }

        const pct = Math.min(100, Math.max(0, Math.round(percentage)));
        const watchedFinished = pct >= 95; // 95%+ constitutes finished watching

        const [existing] = await db
          .select()
          .from(userProgress)
          .where(
            and(
              eq(userProgress.userId, userId),
              eq(userProgress.videoId, videoId),
            ),
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
        sendServerError(res, err, "Error updating watch progress");
      }
    },
  );

  // Submit quiz answers
  app.post("/api/progress/quiz", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { videoId, answers } = req.body; // array of selected option indices e.g. [1, 1, 1]

      if (!videoId || !Array.isArray(answers)) {
        return res
          .status(400)
          .json({ error: "Video ID and answers array are required" });
      }

      // Check if user finished video first
      const [prog] = await db
        .select()
        .from(userProgress)
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.videoId, videoId),
          ),
        );

      if (!prog || !prog.watchedFinished) {
        return res.status(400).json({
          error: "You must complete watching the video before taking the quiz!",
        });
      }

      const questions = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.videoId, videoId))
        .orderBy(asc(quizQuestions.id));

      if (questions.length === 0) {
        return res
          .status(400)
          .json({ error: "No quiz questions available for this video" });
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
          ? "Congratulations! You passed the quiz (at least 2/3 required). Next section unlocked!"
          : `You scored ${score}/${totalQuestions}. You must score at least 2 out of 3 to pass and proceed. Please review the video and try again!`,
        questionResults,
        progress: updatedProg,
      });
    } catch (err: any) {
      sendServerError(res, err, "Error submitting quiz");
    }
  });

  // ----------------------------------------------------
  // ADMIN REPORTS & USER MANAGEMENT ENDPOINTS
  // ----------------------------------------------------
  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
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
          mustChangePassword: users.mustChangePassword,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(homes, eq(users.homeId, homes.id))
        .orderBy(asc(users.id));

      res.json(allUsers);
    } catch (err: any) {
      sendServerError(res, err, "Error fetching users");
    }
  });

  app.post("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { email, username, role, homeId, password } = req.body;

      if (!email || !username || !password) {
        return res
          .status(400)
          .json({ error: "Email, username, and password are required" });
      }
      if (password.length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters" });
      }

      const customUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const passwordHash = await hashPassword(password);

      const [newUser] = await db
        .insert(users)
        .values({
          uid: customUid,
          email,
          username,
          role: role || "staff",
          homeId: homeId ? parseInt(homeId, 10) : null,
          passwordHash,
          // The admin set this password directly, so force the user to pick
          // their own the first time they log in with it.
          mustChangePassword: true,
        })
        .returning({
          id: users.id,
          uid: users.uid,
          email: users.email,
          username: users.username,
          role: users.role,
          homeId: users.homeId,
        });

      res.status(201).json(newUser);
    } catch (err: any) {
      sendServerError(res, err, "Error creating user");
    }
  });

  app.put(
    "/api/admin/users/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id, 10);
        const { email, username, role, homeId, password } = req.body;

        if (password && password.length < 8) {
          return res
            .status(400)
            .json({ error: "Password must be at least 8 characters" });
        }

        const updateData: any = {};
        if (email) updateData.email = email;
        if (username) updateData.username = username;
        if (role) updateData.role = role;
        if (homeId !== undefined)
          updateData.homeId = homeId ? parseInt(homeId, 10) : null;
        if (password) {
          updateData.passwordHash = await hashPassword(password);
          // Same reasoning as account creation: an admin-set password must be
          // changed by the user before it's trusted long-term.
          updateData.mustChangePassword = true;
        }

        const [updated] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, userId))
          .returning({
            id: users.id,
            uid: users.uid,
            email: users.email,
            username: users.username,
            role: users.role,
            homeId: users.homeId,
          });

        res.json(updated);
      } catch (err: any) {
        sendServerError(res, err, "Error updating user");
      }
    },
  );

  app.delete(
    "/api/admin/users/:id",
    requireAuth,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const userId = parseInt(req.params.id, 10);
        if (req.user && userId === req.user.id) {
          return res
            .status(400)
            .json({
              error: "You cannot delete your own active admin account!",
            });
        }
        await db.delete(userProgress).where(eq(userProgress.userId, userId));
        await db.delete(users).where(eq(users.id, userId));
        res.json({ message: "User deleted successfully" });
      } catch (err: any) {
        sendServerError(res, err, "Error deleting user");
      }
    },
  );

  // Admin completion report across all staff and homes
  app.get("/api/admin/reports", requireAuth, requireAdmin, async (req, res) => {
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
        .where(eq(users.role, "staff"));

      const allVids = await db.select().from(videos);
      const allProg = await db.select().from(userProgress);

      const reports = staffMembers.map((st) => {
        const userProgs = allProg.filter((p) => p.userId === st.id);
        const completedVideos = userProgs.filter((p) => p.passed).length;
        const totalVideos = allVids.length;
        const overallPercentage =
          totalVideos > 0
            ? Math.round((completedVideos / totalVideos) * 100)
            : 0;

        return {
          userId: st.id,
          username: st.username,
          email: st.email,
          homeName: st.homeName || "Unassigned",
          completedVideos,
          totalVideos,
          overallPercentage,
          progressDetails: userProgs,
        };
      });

      res.json(reports);
    } catch (err: any) {
      sendServerError(res, err, "Error generating report");
    }
  });

  // ----------------------------------------------------
  // VITE MIDDLEWARE FOR SERVING FRONTEND & PRODUCTION
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  // Report DB reachability at startup without blocking the server from
  // coming up — routes already degrade gracefully via sendServerError.
  (async () => {
    const status = await checkDatabaseConnection();
    if (!status.ok) {
      console.error(
        `[db] Could not reach the database: ${status.error}. ` +
          `Check DATABASE_URL / SQL_HOST, SQL_DB_NAME, SQL_USER, SQL_PASSWORD in your .env file, ` +
          `and confirm the database server is running and reachable. API requests will return 503 until this is resolved.`,
      );
      return;
    }
    console.log("[db] Connected successfully.");
  })();

  const shutdown = async (signal: string) => {
    console.log(`[server] Received ${signal}, shutting down...`);
    server.close(() => console.log("[server] HTTP server closed."));
    await closeDatabasePool();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer();
