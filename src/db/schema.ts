import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

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

export const sections = pgTable('sections', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  orderNum: integer('order_num').notNull().default(0),
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
  createdAt: timestamp('created_at').defaultNow(),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  videoId: integer('video_id').references(() => videos.id).notNull(),
  question: text('question').notNull(),
  options: jsonb('options').$type<string[]>().notNull(),
  correctIndex: integer('correct_index').notNull(),
  explanation: text('explanation'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userProgress = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  videoId: integer('video_id').references(() => videos.id).notNull(),
  percentage: integer('percentage').notNull().default(0),
  watchedFinished: boolean('watched_finished').notNull().default(false),
  quizCompleted: boolean('quiz_completed').notNull().default(false),
  quizScore: integer('quiz_score').notNull().default(0),
  passed: boolean('passed').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

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
}));

export const sectionsRelations = relations(sections, ({ many }) => ({
  videos: many(videos),
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
