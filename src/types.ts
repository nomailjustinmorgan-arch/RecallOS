export type View = 'landing' | 'setup' | 'mission' | 'session' | 'result' | 'dashboard';

export interface StudyPlan {
  subject: string;
  goal: string;
  daysRemaining: number;
  dailyMinutes: number;
  weakTopics: string[];
  createdAt: number;
}

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface TopicState {
  name: string;
  mastery: number;
  confidence: ConfidenceLevel;
  sessionsCompleted: number;
  lastStudied: number | null;
  isWeak: boolean;
}

export interface SessionResult {
  id: string;
  topic: string;
  dayNumber: number;
  accuracy: number;
  confidence: ConfidenceLevel;
  durationMinutes: number;
  mistakes: Mistake[];
  insight: string;
  nextRecommendation: string;
  createdAt: number;
}

export interface Mistake {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  pattern: string;
}

export interface SessionQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  topic: string;
}

export interface AdaptivePlan {
  priorityTopic: string;
  recommendedActivity: string;
  reasoning: string;
  estimatedDuration: number;
  adaptationNotes: string;
  traceId: string | null;
  createdAt: number;
}

export type NeuralStatus = 'idle' | 'loading' | 'success' | 'error' | 'timeout';

export interface AppState {
  plan: StudyPlan | null;
  topics: TopicState[];
  sessions: SessionResult[];
  currentDay: number;
  currentSession: {
    topic: string;
    questions: SessionQuestion[];
    answers: number[];
    startTime: number;
  } | null;
  adaptivePlan: AdaptivePlan | null;
  neuralStatus: NeuralStatus;
  neuralError: string | null;
}
