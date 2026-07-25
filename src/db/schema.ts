import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, jsonb, unique, index } from 'drizzle-orm/pg-core';

export const homes = pgTable('homes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  username: text('username').notNull(),
  role: text('role').notNull().default('staff'), // 'staff' | 'admin'
  homeId: integer('home_id').references(() => homes.id),
  passwordHash: text('password_hash'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  otpCode: text('otp_code'),
  otpExpiresAt: timestamp('otp_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// A "section" functions as this project's course-level grouping — there is
// no separate courses table. Assignments and archival below operate at the
// section level rather than introducing a parallel Course entity.
export const sections = pgTable('sections', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  orderNum: integer('order_num').notNull().default(0),
  isArchived: boolean('is_archived').notNull().default(false),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const videos = pgTable('videos', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').references(() => sections.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  url: text('url').notNull(),
  durationSeconds: integer('duration_seconds').notNull().default(180),
  orderNum: integer('order_num').notNull().default(0),
  isArchived: boolean('is_archived').notNull().default(false),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Which staff members may see which section ("course"). Staff only see
// sections they have an assignment row for; admins see everything.
export const courseAssignments = pgTable(
  'course_assignments',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    sectionId: integer('section_id').references(() => sections.id).notNull(),
    assignedBy: integer('assigned_by').references(() => users.id),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    dueDate: timestamp('due_date'),
    required: boolean('required').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userSectionUnique: unique('course_assignments_user_section_unique').on(table.userId, table.sectionId),
    userIdIdx: index('course_assignments_user_id_idx').on(table.userId),
    sectionIdIdx: index('course_assignments_section_id_idx').on(table.sectionId),
  })
);

export const quizQuestions = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  videoId: integer('video_id').references(() => videos.id).notNull(),
  question: text('question').notNull(),
  options: jsonb('options').$type<string[]>().notNull(),
  correctIndex: integer('correct_index').notNull(),
  explanation: text('explanation'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userProgress = pgTable(
  'user_progress',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    videoId: integer('video_id').references(() => videos.id).notNull(),
    percentage: integer('percentage').notNull().default(0),
    watchedFinished: boolean('watched_finished').notNull().default(false),
    quizCompleted: boolean('quiz_completed').notNull().default(false),
    quizScore: integer('quiz_score').notNull().default(0),
    passed: boolean('passed').notNull().default(false),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userVideoUnique: unique('user_progress_user_video_unique').on(table.userId, table.videoId),
  })
);

// A summarized watch session per (user, video, "sitting") rather than a raw
// event log — cheaper to store and query while still supporting sessions,
// last position, active-watch-time, and multi-session history per the spec.
export const videoWatchSessions = pgTable(
  'video_watch_sessions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    videoId: integer('video_id').references(() => videos.id).notNull(),
    openedAt: timestamp('opened_at').defaultNow().notNull(),
    firstPlayedAt: timestamp('first_played_at'),
    lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
    closedAt: timestamp('closed_at'),
    startPositionSeconds: integer('start_position_seconds').notNull().default(0),
    lastPositionSeconds: integer('last_position_seconds').notNull().default(0),
    activeWatchSeconds: integer('active_watch_seconds').notNull().default(0),
    videoDurationSeconds: integer('video_duration_seconds'),
    completionPercentage: integer('completion_percentage').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    completedAt: timestamp('completed_at'),
    exitReason: text('exit_reason'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('video_watch_sessions_user_id_idx').on(table.userId),
    videoIdIdx: index('video_watch_sessions_video_id_idx').on(table.videoId),
    lastActivityIdx: index('video_watch_sessions_last_activity_idx').on(table.lastActivityAt),
  })
);

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    // Quizzes are attached 1:1 to a video in this schema (see quizQuestions.videoId).
    videoId: integer('video_id').references(() => videos.id).notNull(),
    attemptNumber: integer('attempt_number').notNull(),
    startedAt: timestamp('started_at'),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    score: integer('score').notNull(),
    maximumScore: integer('maximum_score').notNull(),
    percentage: integer('percentage').notNull(),
    passed: boolean('passed').notNull(),
    timeSpentSeconds: integer('time_spent_seconds'),
    answers: jsonb('answers').$type<number[]>(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('quiz_attempts_user_id_idx').on(table.userId),
    videoIdIdx: index('quiz_attempts_video_id_idx').on(table.videoId),
    completedAtIdx: index('quiz_attempts_submitted_at_idx').on(table.submittedAt),
  })
);

// Relations
export const homesRelations = relations(homes, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  home: one(homes, {
    fields: [users.homeId],
    references: [homes.id],
  }),
  progress: many(userProgress),
  assignments: many(courseAssignments),
}));

export const sectionsRelations = relations(sections, ({ many }) => ({
  videos: many(videos),
  assignments: many(courseAssignments),
}));

export const courseAssignmentsRelations = relations(courseAssignments, ({ one }) => ({
  user: one(users, {
    fields: [courseAssignments.userId],
    references: [users.id],
  }),
  section: one(sections, {
    fields: [courseAssignments.sectionId],
    references: [sections.id],
  }),
  assignedByUser: one(users, {
    fields: [courseAssignments.assignedBy],
    references: [users.id],
  }),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  section: one(sections, {
    fields: [videos.sectionId],
    references: [sections.id],
  }),
  quizQuestions: many(quizQuestions),
  progress: many(userProgress),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  video: one(videos, {
    fields: [quizQuestions.videoId],
    references: [videos.id],
  }),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [userProgress.videoId],
    references: [videos.id],
  }),
}));

export const videoWatchSessionsRelations = relations(videoWatchSessions, ({ one }) => ({
  user: one(users, {
    fields: [videoWatchSessions.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [videoWatchSessions.videoId],
    references: [videos.id],
  }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [quizAttempts.videoId],
    references: [videos.id],
  }),
}));
