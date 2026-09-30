import { supabase } from '@/lib/supabase';

const NEURAL_FUNCTION_PATH = '/functions/v1/neural-pulse';
const CLIENT_TIMEOUT_MS = 35_000;

export type NeuralActionType =
  | 'create_schema'
  | 'insert_data'
  | 'select_data'
  | 'update_data'
  | 'delete_data'
  | 'chat';

export interface NeuralResponse {
  response?: string;
  traceId?: string;
  schema_execution?: {
    executed?: boolean;
    tablesCreated?: string[];
    errors?: string[];
  };
  action?: string;
  table?: string;
  row?: Record<string, unknown>;
  data?: Record<string, unknown>[];
  status?: string;
  [key: string]: unknown;
}

export interface NeuralError {
  error: string;
  code: 'TIMEOUT' | 'API_ERROR' | 'NETWORK' | 'PARSE' | 'MISSING_KEY' | 'INTERNAL';
  status?: number;
  traceId?: string;
}

export interface NeuralResult {
  data: NeuralResponse | null;
  error: NeuralError | null;
  traceId: string | null;
}

async function callNeuralPulse(
  actionType: NeuralActionType,
  options?: { prompt?: string; dataPayload?: Record<string, unknown> },
): Promise<NeuralResult> {
  const body: Record<string, unknown> = { action_type: actionType };
  if (options?.prompt) body.prompt = options.prompt;
  if (options?.dataPayload) body.data_payload = options.dataPayload;

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}${NEURAL_FUNCTION_PATH}`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorBody: NeuralError;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = {
          error: `HTTP ${res.status}`,
          code: 'API_ERROR',
          status: res.status,
        };
      }
      if (import.meta.env.DEV) {
        console.error(`[NeuralPulse] ${actionType} failed:`, errorBody);
      }
      return { data: null, error: errorBody, traceId: errorBody.traceId ?? null };
    }

    const data: NeuralResponse = await res.json();
    const traceId = data.traceId ?? null;

    if (import.meta.env.DEV && traceId) {
      console.log(`[NeuralPulse] ${actionType} traceId=${traceId}`);
    }

    return { data, error: null, traceId };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof DOMException && err.name === 'AbortError') {
      const error: NeuralError = {
        error: 'Request timed out',
        code: 'TIMEOUT',
      };
      if (import.meta.env.DEV) console.error(`[NeuralPulse] ${actionType} timed out`);
      return { data: null, error, traceId: null };
    }

    const error: NeuralError = {
      error: err instanceof Error ? err.message : 'Network error',
      code: 'NETWORK',
    };
    if (import.meta.env.DEV) console.error(`[NeuralPulse] ${actionType} network error:`, err);
    return { data: null, error, traceId: null };
  }
}

// ── Schema initialization ──

export async function initializeNeuralSchema(): Promise<NeuralResult> {
  return callNeuralPulse('create_schema', {
    prompt: 'Define RecallOS adaptive study system schema',
    dataPayload: {
      tables: [
        {
          name: 'learners',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'subject', type: 'text' },
            { name: 'goal', type: 'text' },
            { name: 'days_remaining', type: 'integer' },
            { name: 'daily_minutes', type: 'integer' },
            { name: 'weak_topics', type: 'text[]' },
            { name: 'current_day', type: 'integer' },
            { name: 'created_at', type: 'timestamp' },
          ],
        },
        {
          name: 'learning_topics',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'learner_id', type: 'uuid' },
            { name: 'name', type: 'text' },
            { name: 'mastery', type: 'integer' },
            { name: 'confidence', type: 'text' },
            { name: 'sessions_completed', type: 'integer' },
            { name: 'last_studied', type: 'timestamp' },
            { name: 'is_weak', type: 'boolean' },
          ],
        },
        {
          name: 'study_sessions',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'learner_id', type: 'uuid' },
            { name: 'topic', type: 'text' },
            { name: 'accuracy', type: 'integer' },
            { name: 'confidence', type: 'text' },
            { name: 'duration_minutes', type: 'integer' },
            { name: 'mistakes', type: 'json' },
            { name: 'insight', type: 'text' },
            { name: 'next_recommendation', type: 'text' },
            { name: 'day_number', type: 'integer' },
            { name: 'created_at', type: 'timestamp' },
          ],
        },
        {
          name: 'adaptive_plans',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'learner_id', type: 'uuid' },
            { name: 'priority_topic', type: 'text' },
            { name: 'recommended_activity', type: 'text' },
            { name: 'reasoning', type: 'text' },
            { name: 'estimated_duration', type: 'integer' },
            { name: 'adaptation_notes', type: 'text' },
            { name: 'day_number', type: 'integer' },
            { name: 'trace_id', type: 'text' },
            { name: 'created_at', type: 'timestamp' },
          ],
        },
      ],
    },
  });
}

// ── Persist learning topics ──

export async function persistLearningTopics(
  topics: {
    id: string;
    learner_id: string;
    name: string;
    mastery: number;
    confidence: string;
    sessions_completed: number;
    last_studied: string | null;
    is_weak: boolean;
  }[],
): Promise<NeuralResult> {
  // Insert topics one by one since the API takes a single record
  for (const topic of topics) {
    const result = await callNeuralPulse('insert_data', {
      prompt: 'Insert learning topic into RecallOS',
      dataPayload: {
        table: 'learning_topics',
        record: topic,
      },
    });
    if (result.error && import.meta.env.DEV) {
      console.warn(`[NeuralPulse] topic insert failed for ${topic.name}:`, result.error);
    }
  }
  return { data: null, error: null, traceId: null };
}

// ── Update topic state in Neural Pulse ──

export async function updateTopicState(
  learnerId: string,
  topicName: string,
  changes: {
    mastery: number;
    confidence: string;
    sessions_completed: number;
    last_studied: string;
    is_weak: boolean;
  },
): Promise<NeuralResult> {
  return callNeuralPulse('update_data', {
    prompt: 'Update learning topic state in RecallOS',
    dataPayload: {
      table: 'learning_topics',
      where: { learner_id: learnerId, name: topicName },
      changes,
    },
  });
}

// ── Retrieve learner sessions from Neural Pulse ──

export async function selectLearnerSessions(
  learnerId: string,
): Promise<NeuralResult> {
  return callNeuralPulse('select_data', {
    prompt: 'Retrieve learner study sessions from RecallOS',
    dataPayload: {
      table: 'study_sessions',
      where: { learner_id: learnerId },
    },
  });
}

// ── Persist learner setup ──

export async function persistLearnerSetup(
  learner: {
    id: string;
    subject: string;
    goal: string;
    days_remaining: number;
    daily_minutes: number;
    weak_topics: string[];
    current_day: number;
  },
): Promise<NeuralResult> {
  return callNeuralPulse('insert_data', {
    prompt: 'Insert new learner into RecallOS',
    dataPayload: {
      table: 'learners',
      record: learner,
    },
  });
}

// ── Persist study session result ──

export async function persistSessionResult(
  session: {
    id: string;
    learner_id: string;
    topic: string;
    accuracy: number;
    confidence: string;
    duration_minutes: number;
    mistakes: unknown[];
    insight: string;
    next_recommendation: string;
    day_number: number;
    created_at: string;
  },
): Promise<NeuralResult> {
  return callNeuralPulse('insert_data', {
    prompt: 'Insert study session result into RecallOS',
    dataPayload: {
      table: 'study_sessions',
      record: session,
    },
  });
}

// ── Retrieve learner historical data ──

export async function retrieveLearnerHistory(
  learnerId: string,
): Promise<NeuralResult> {
  return callNeuralPulse('select_data', {
    prompt: 'Retrieve learner study sessions and topics',
    dataPayload: {
      table: 'study_sessions',
      where: { learner_id: learnerId },
    },
  });
}

// ── Adaptive reasoning via chat ──

export interface AdaptiveRecommendation {
  priorityTopic: string;
  recommendedActivity: string;
  reasoning: string;
  estimatedDuration: number;
  adaptationNotes: string;
}

export interface AdaptiveResult {
  recommendation: AdaptiveRecommendation | null;
  error: NeuralError | null;
  traceId: string | null;
}

function parseAdaptiveResponse(responseText: string): AdaptiveRecommendation | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        priorityTopic: parsed.priority_topic ?? parsed.priorityTopic ?? '',
        recommendedActivity: parsed.recommended_activity ?? parsed.recommendedActivity ?? '',
        reasoning: parsed.reasoning ?? '',
        estimatedDuration: Number(parsed.estimated_duration ?? parsed.estimatedDuration ?? 0),
        adaptationNotes: parsed.adaptation_notes ?? parsed.adaptationNotes ?? '',
      };
    }
  } catch {
    // Fall through to text parsing
  }

  // Fallback: try to extract fields from natural language
  const topicMatch = responseText.match(/(?:priority topic|topic)[:\s]+(.+)/i);
  const activityMatch = responseText.match(/(?:recommended activity|activity)[:\s]+(.+)/i);
  const reasoningMatch = responseText.match(/(?:reasoning|why)[:\s]+(.+)/i);
  const durationMatch = responseText.match(/(?:estimated duration|duration)[:\s]+(\d+)/i);
  const adaptationMatch = responseText.match(/(?:adaptation|notes)[:\s]+(.+)/i);

  if (topicMatch || activityMatch || reasoningMatch) {
    return {
      priorityTopic: topicMatch?.[1]?.trim() ?? '',
      recommendedActivity: activityMatch?.[1]?.trim() ?? '',
      reasoning: reasoningMatch?.[1]?.trim() ?? '',
      estimatedDuration: durationMatch ? Number(durationMatch[1]) : 0,
      adaptationNotes: adaptationMatch?.[1]?.trim() ?? '',
    };
  }

  return null;
}

export async function getAdaptiveRecommendation(
  context: {
    learnerId: string;
    subject: string;
    goal: string;
    daysRemaining: number;
    dailyMinutes: number;
    currentDay: number;
    topics: { name: string; mastery: number; confidence: string; sessionsCompleted: number; isWeak: boolean }[];
    recentSessions: { topic: string; accuracy: number; confidence: string; dayNumber: number }[];
  },
): Promise<AdaptiveResult> {
  const topicsSummary = context.topics
    .map(
      (t) =>
        `${t.name} (mastery: ${t.mastery}%, confidence: ${t.confidence}, sessions: ${t.sessionsCompleted}${t.isWeak ? ', weak area' : ''})`,
    )
    .join('; ');

  const sessionsSummary = context.recentSessions
    .slice(-10)
    .map(
      (s) =>
        `Day ${s.dayNumber}: ${s.topic} — ${s.accuracy}% accuracy, ${s.confidence} confidence`,
    )
    .join('; ');

  const prompt = `You are the adaptive AI engine for RecallOS, an adaptive study system. Analyze the learner's current state and determine the next best study action.

LEARNER CONTEXT:
- Subject: ${context.subject}
- Goal: ${context.goal}
- Days remaining: ${context.daysRemaining}
- Daily study minutes available: ${context.dailyMinutes}
- Current day: ${context.currentDay}

TOPIC STATES:
${topicsSummary || 'No topics yet.'}

RECENT SESSION HISTORY:
${sessionsSummary || 'No sessions completed yet.'}

Based on the learner's goal, current topic mastery levels, confidence, weak areas, and recent session performance, determine:
1. The highest priority topic to study next
2. The recommended next activity (type of study session)
3. Your reasoning for this choice
4. The estimated duration in minutes
5. How the plan should adapt based on previous performance

Respond as valid JSON only:
{
  "priority_topic": "topic name",
  "recommended_activity": "description of the study activity",
  "reasoning": "detailed reasoning for this recommendation",
  "estimated_duration": 30,
  "adaptation_notes": "how the plan adapted based on recent performance"
}`;

  const result = await callNeuralPulse('chat', { prompt });

  if (result.error) {
    return { recommendation: null, error: result.error, traceId: result.traceId };
  }

  if (!result.data || !result.data.response) {
    return {
      recommendation: null,
      error: { error: 'No response from Neural Pulse', code: 'PARSE' },
      traceId: result.traceId,
    };
  }

  const recommendation = parseAdaptiveResponse(result.data.response);

  if (!recommendation) {
    return {
      recommendation: null,
      error: { error: 'Could not parse adaptive recommendation', code: 'PARSE' },
      traceId: result.traceId,
    };
  }

  return { recommendation, error: null, traceId: result.traceId };
}

// ── Persist adaptive plan ──

export async function persistAdaptivePlan(
  plan: {
    id: string;
    learner_id: string;
    priority_topic: string;
    recommended_activity: string;
    reasoning: string;
    estimated_duration: number;
    adaptation_notes: string;
    day_number: number;
    trace_id: string | null;
    created_at: string;
  },
): Promise<NeuralResult> {
  return callNeuralPulse('insert_data', {
    prompt: 'Insert adaptive plan recommendation into RecallOS',
    dataPayload: {
      table: 'adaptive_plans',
      record: plan,
    },
  });
}
