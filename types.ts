
export enum InterviewStage {
  INTRODUCTION = 'INTRODUCTION',
  TECHNICAL = 'TECHNICAL',
  BEHAVIORAL = 'BEHAVIORAL',
  SCENARIO = 'SCENARIO'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum UserDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Question {
  id: string;
  text: string;
  stage: InterviewStage;
  difficulty: Difficulty;
  timeLimit: number;
  type: 'NEW' | 'FOLLOW_UP';
}

export interface Answer {
  questionId: string;
  text: string;
  responseTime: number;
  score?: number;
  feedback?: string;
  audioData?: string; // Base64 encoded audio string
  videoData?: string; // Base64 encoded video string
}

export interface UserContext {
  role: string;
  difficulty: UserDifficulty;
  resume: string;
  resumeImage?: string;
  resumeImageMimeType?: string;
  jobDescription: string;
}

export interface PerformanceState {
  currentStage: InterviewStage;
  currentDifficulty: Difficulty;
  mcqScores: { questionId: string; isCorrect: boolean; timeTaken: number; skipped?: boolean }[];
  completedQuestions: number;
  totalScore: number;
  history: { question: Question; answer: Answer }[];
  skillsAnalysis?: {
    strengths: string[];
    gaps: string[];
    mapping: { skill: string; proficiency: number }[];
    score: number; // 0-100 based on resume mapping
  };
}

export interface FinalReport {
  overallScore: number;
  readiness: 'STRONG' | 'AVERAGE' | 'NEEDS_IMPROVEMENT';
  sectionScores: {
    resume: number;
    mcq: number;
    interview: number;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  hiringIndicator: string;
}