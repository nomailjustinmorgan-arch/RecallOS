import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Database table types ──

export interface StudyPlanRow {
  id: string;
  subject: string;
  goal: string;
  days_remaining: number;
  daily_minutes: number;
  weak_topics: string[];
  current_day: number;
  created_at: string;
}

export interface TopicRow {
  id: string;
  plan_id: string;
  name: string;
  mastery: number;
  confidence: 'low' | 'medium' | 'high';
  sessions_completed: number;
  last_studied: string | null;
  is_weak: boolean;
  created_at: string;
}

export interface SessionRow {
  id: string;
  plan_id: string;
  topic: string;
  day_number: number;
  accuracy: number;
  confidence: 'low' | 'medium' | 'high';
  duration_minutes: number;
  insight: string;
  next_recommendation: string;
  created_at: string;
}

export interface MistakeRow {
  id: string;
  session_id: string;
  question: string;
  user_answer: string;
  correct_answer: string;
  pattern: string;
  created_at: string;
}

export interface AdaptivePlanRow {
  id: string;
  plan_id: string;
  priority_topic: string;
  recommended_activity: string;
  reasoning: string;
  estimated_duration: number;
  adaptation_notes: string;
  day_number: number;
  trace_id: string | null;
  created_at: string;
}
