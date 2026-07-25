export interface Home {
  id: number;
  name: string;
  code: string;
}

export interface User {
  id: number;
  uid: string;
  email: string;
  username: string;
  role: 'staff' | 'admin';
  homeId: number | null;
  homeName?: string;
  otpCode?: string;
  mustChangePassword?: boolean;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  orderNum: number;
  videos: Video[];
  required?: boolean;
  dateAdded?: string;
}

export interface VideoDetail extends Video {
  sectionId: number;
  sectionTitle?: string;
  lastPositionSeconds?: number;
  completionThreshold?: number;
  progress: {
    percentage: number;
    watchedFinished: boolean;
    quizCompleted: boolean;
    quizScore: number;
    passed: boolean;
  };
}

export interface CourseAssignment {
  id: number;
  sectionId: number;
  sectionTitle: string;
  required: boolean;
  dueDate: string | null;
  assignedAt: string;
  assignedBy: number | null;
  assignedByName?: string | null;
  completedVideos: number;
  totalVideos: number;
  completionPercentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
  lastActivity: string | null;
}

export interface VideoWatchSession {
  id: number;
  userId: number;
  videoId: number;
  openedAt: string;
  firstPlayedAt: string | null;
  lastActivityAt: string;
  closedAt: string | null;
  startPositionSeconds: number;
  lastPositionSeconds: number;
  activeWatchSeconds: number;
  videoDurationSeconds: number | null;
  completionPercentage: number;
  completed: boolean;
  completedAt: string | null;
  exitReason: string | null;
}

export interface StaffVideoActivity {
  videoId: number;
  videoTitle: string;
  sectionId: number;
  sectionTitle: string | null;
  firstOpened: string | null;
  lastOpened: string | null;
  numberOfSessions: number;
  totalActiveWatchSeconds: number;
  videoDurationSeconds: number | null;
  lastPositionSeconds: number;
  watchedPercentage: number;
  completed: boolean;
  completedAt: string | null;
}

export interface QuizAttemptRecord {
  id: number;
  videoId: number;
  videoTitle: string;
  sectionId: number;
  sectionTitle: string | null;
  attemptNumber: number;
  startedAt: string | null;
  submittedAt: string;
  score: number;
  maximumScore: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number | null;
}

export interface CompletionHistoryRecord {
  videoId: number;
  videoTitle: string;
  sectionId: number;
  sectionTitle: string | null;
  updatedAt: string;
  percentage: number;
  quizScore: number;
  passed: boolean;
}

export interface TimelineEvent {
  type: string;
  timestamp: string;
  description: string;
}

export interface TimelinePage {
  events: TimelineEvent[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface StaffDetailHeader {
  id: number;
  uid: string;
  email: string;
  username: string;
  role: 'staff' | 'admin';
  homeId: number | null;
  homeName: string | null;
  createdAt: string;
  mustChangePassword: boolean;
  lastActivity: string | null;
}

export interface AdminDashboardSummary {
  summary: {
    totalActiveStaff: number;
    totalActiveCourses: number;
    totalPublishedVideos: number;
    totalActiveAssignments: number;
    overallCompletionRate: number;
    staffWithOutstandingRequiredTraining: number;
  };
  recentActivity: {
    courses: { id: number; title: string; createdAt: string }[];
    videos: { id: number; title: string; sectionId: number; createdAt: string }[];
    assignments: { id: number; userId: number; sectionId: number; assignedAt: string; username: string | null; sectionTitle: string | null }[];
    completions: { id: number; userId: number; videoId: number; updatedAt: string; username: string | null; videoTitle: string | null }[];
  };
  outstandingTraining: {
    staffCount: number;
    topCourses: { sectionId: number; title: string; incompleteCount: number }[];
  };
}

export interface ProgressSummary {
  totalVideos: number;
  completedVideos: number;
  outstandingVideos: number;
  completedCourses: number;
  inProgressCourses: number;
}

export interface CompletionHistoryItem {
  videoCode: string;
  videoTitle: string;
  courseTitle: string;
  completedAt: string;
  passed: boolean;
}

export interface QuizQuestion {
  id: number;
  videoId: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Video {
  id: number;
  sectionId: number;
  title: string;
  description: string;
  url: string;
  durationSeconds: number;
  orderNum: number;
  code?: string;
  level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Standard';
  attachmentUrl?: string;
  required?: boolean;
  percentage?: number;
  watchedFinished?: boolean;
  quizCompleted?: boolean;
  quizScore?: number;
  passed?: boolean;
  quizQuestions?: QuizQuestion[];
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Section {
  id: number;
  title: string;
  description: string;
  orderNum: number;
  videos: Video[];
  required?: boolean;
  dueDate?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt?: string;
}

export interface UserProgress {
  id: number;
  userId: number;
  videoId: number;
  percentage: number;
  watchedFinished: boolean;
  quizCompleted: boolean;
  quizScore: number;
  passed: boolean;
  updatedAt?: string;
}

export interface StaffReport {
  userId: number;
  username: string;
  email: string;
  homeName: string;
  assignedCourses: number;
  completedVideos: number;
  totalVideos: number;
  outstandingVideos: number;
  completionPercentage: number;
  avgQuizScore: number | null;
  lastActivity: string | null;
  status: 'no_assignments' | 'not_started' | 'in_progress' | 'completed';
}
