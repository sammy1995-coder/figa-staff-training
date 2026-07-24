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
  progress: {
    percentage: number;
    watchedFinished: boolean;
    quizCompleted: boolean;
    quizScore: number;
    passed: boolean;
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
  completedVideos: number;
  totalVideos: number;
  overallPercentage: number;
  progressDetails: UserProgress[];
}
