export type Category =
  | "Pilotage"
  | "Avion & procédures"
  | "Radio & réglementation"
  | "Météo"
  | "Navigation"
  | "Synthèse";

export type View =
  | "home"
  | "path"
  | "practice"
  | "review"
  | "exams"
  | "profile"
  | "week"
  | "lesson";

export interface Lesson {
  id: string;
  week: number;
  day: number;
  title: string;
  minutes: number;
  markdown: string;
  hasFs2024: boolean;
}

export interface WeeklyControl {
  questions: string[];
  answers: string[];
  validation: string;
}

export interface CourseWeek {
  number: number;
  title: string;
  category: Category;
  objective: string;
  vocabulary: string[];
  lessons: Lesson[];
  control: WeeklyControl;
  raw: string;
}

export interface McqQuestion {
  id: string;
  week: number;
  category: Category;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface ReviewSchedule {
  id: string;
  dueAt: string;
  intervalDays: number;
  repetitions: number;
  correct: number;
  wrong: number;
}

export interface MissionProgress {
  completed: boolean;
  checks: boolean[];
  bestScore?: number;
  completedAt?: string;
}

export interface StudyEvent {
  date: string;
  minutes: number;
  xp: number;
  type: "lesson" | "quiz" | "review" | "mission" | "exam";
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
  xp: number;
  streak: number;
  lastStudyDate?: string;
  completedLessons: string[];
  weekTestScores: Record<string, number>;
  mcqResults: Record<string, { attempts: number; correct: number; lastAt: string }>;
  reviews: Record<string, ReviewSchedule>;
  notes: Record<string, string>;
  bookmarks: string[];
  missions: Record<string, MissionProgress>;
  studyLog: StudyEvent[];
  badges: string[];
}

export interface Mission {
  id: string;
  week: number;
  title: string;
  subtitle: string;
  duration: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  objectives: string[];
  briefing: string[];
  debrief: string[];
  xp: number;
}
