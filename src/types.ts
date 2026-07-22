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
  percentage?: number;
  watchedFinished?: boolean;
  quizCompleted?: boolean;
  quizScore?: number;
  passed?: boolean;
  quizQuestions?: QuizQuestion[];
}

export interface Section {
  id: number;
  title: string;
  description: string;
  orderNum: number;
  videos: Video[];
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
