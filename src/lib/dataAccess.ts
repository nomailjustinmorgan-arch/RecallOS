import { supabase } from '@/lib/supabase';
import type {
  AdaptivePlanRow,
  MistakeRow,
  SessionRow,
  StudyPlanRow,
  TopicRow,
} from '@/lib/supabase';
import type {
  AdaptivePlan,
  AppState,
  ConfidenceLevel,
  Mistake,
  SessionResult,
  StudyPlan,
  TopicState,
} from '@/types';

// ── Load ──

export async function loadAppState(planId: string): Promise<Partial<AppState> | null> {
  const { data: planRow, error: planError } = await supabase
    .from('study_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  if (planError || !planRow) return null;

  const plan = rowToStudyPlan(planRow);

  const { data: topicRows } = await supabase
    .from('topics')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: true });

  const topics = topicRows ? topicRows.map(rowToTopicState) : [];

  const { data: sessionRows } = await supabase
    .from('sessions')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: true });

  const sessions: SessionResult[] = [];
  if (sessionRows) {
    for (const sRow of sessionRows) {
      const { data: mistakeRows } = await supabase
        .from('mistakes')
        .select('*')
        .eq('session_id', sRow.id);

      sessions.push(rowToSessionResult(sRow, mistakeRows ?? []));
    }
  }

  return {
    plan,
    topics,
    sessions,
    currentDay: planRow.current_day,
  };
}

// ── Create plan + topics ──

export async function saveNewPlan(
  plan: StudyPlan,
  topics: TopicState[],
): Promise<{ planId: string; topicIds: Map<string, string> } | null> {
  const { data: planRow, error: planErr } = await supabase
    .from('study_plans')
    .insert({
      subject: plan.subject,
      goal: plan.goal,
      days_remaining: plan.daysRemaining,
      daily_minutes: plan.dailyMinutes,
      weak_topics: plan.weakTopics,
      current_day: 1,
    })
    .select()
    .single();

  if (planErr || !planRow) return null;

  const topicIds = new Map<string, string>();
  const topicInserts = topics.map((t) => ({
    plan_id: planRow.id,
    name: t.name,
    mastery: t.mastery,
    confidence: t.confidence,
    sessions_completed: t.sessionsCompleted,
    last_studied: null,
    is_weak: t.isWeak,
  }));

  const { data: insertedTopics, error: topicErr } = await supabase
    .from('topics')
    .insert(topicInserts)
    .select();

  if (topicErr || !insertedTopics) return null;

  insertedTopics.forEach((row) => {
    topicIds.set(row.name, row.id);
  });

  return { planId: planRow.id, topicIds };
}

// ── Save session result + mistakes + update topic state ──

export async function saveSessionResult(
  planId: string,
  topicName: string,
  result: SessionResult,
  updatedTopic: TopicState,
  topicId: string,
): Promise<boolean> {
  const { data: sessionRow, error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      plan_id: planId,
      topic: result.topic,
      day_number: result.dayNumber,
      accuracy: result.accuracy,
      confidence: result.confidence,
      duration_minutes: result.durationMinutes,
      insight: result.insight,
      next_recommendation: result.nextRecommendation,
    })
    .select()
    .single();

  if (sessionErr || !sessionRow) return false;

  if (result.mistakes.length > 0) {
    const mistakeInserts = result.mistakes.map((m: Mistake) => ({
      session_id: sessionRow.id,
      question: m.question,
      user_answer: m.userAnswer,
      correct_answer: m.correctAnswer,
      pattern: m.pattern,
    }));

    const { error: mistakeErr } = await supabase
      .from('mistakes')
      .insert(mistakeInserts);

    if (mistakeErr) return false;
  }

  const { error: topicErr } = await supabase
    .from('topics')
    .update({
      mastery: updatedTopic.mastery,
      confidence: updatedTopic.confidence,
      sessions_completed: updatedTopic.sessionsCompleted,
      last_studied: new Date(result.createdAt).toISOString(),
      is_weak: updatedTopic.isWeak,
    })
    .eq('id', topicId);

  if (topicErr) return false;

  const { error: planErr } = await supabase
    .from('study_plans')
    .update({ current_day: result.dayNumber + 1 })
    .eq('id', planId);

  return !planErr;
}

// ── Delete plan (cascade handles children) ──

export async function deletePlan(planId: string): Promise<boolean> {
  const { error } = await supabase
    .from('study_plans')
    .delete()
    .eq('id', planId);
  return !error;
}

// ── Adaptive plan persistence ──

export async function saveAdaptivePlan(
  planId: string,
  adaptivePlan: AdaptivePlan,
  dayNumber: number,
): Promise<boolean> {
  const { error } = await supabase.from('adaptive_plans').insert({
    plan_id: planId,
    priority_topic: adaptivePlan.priorityTopic,
    recommended_activity: adaptivePlan.recommendedActivity,
    reasoning: adaptivePlan.reasoning,
    estimated_duration: adaptivePlan.estimatedDuration,
    adaptation_notes: adaptivePlan.adaptationNotes,
    day_number: dayNumber,
    trace_id: adaptivePlan.traceId,
  });

  return !error;
}

export async function loadLatestAdaptivePlan(planId: string): Promise<AdaptivePlan | null> {
  const { data, error } = await supabase
    .from('adaptive_plans')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as AdaptivePlanRow;
  return {
    priorityTopic: row.priority_topic,
    recommendedActivity: row.recommended_activity,
    reasoning: row.reasoning,
    estimatedDuration: row.estimated_duration,
    adaptationNotes: row.adaptation_notes,
    traceId: row.trace_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// ── Row → domain type mappers ──

function rowToStudyPlan(row: StudyPlanRow): StudyPlan {
  return {
    subject: row.subject,
    goal: row.goal,
    daysRemaining: row.days_remaining,
    dailyMinutes: row.daily_minutes,
    weakTopics: row.weak_topics ?? [],
    createdAt: new Date(row.created_at).getTime(),
  };
}

function rowToTopicState(row: TopicRow): TopicState {
  return {
    name: row.name,
    mastery: row.mastery,
    confidence: row.confidence as ConfidenceLevel,
    sessionsCompleted: row.sessions_completed,
    lastStudied: row.last_studied ? new Date(row.last_studied).getTime() : null,
    isWeak: row.is_weak,
  };
}

function rowToSessionResult(row: SessionRow, mistakes: MistakeRow[]): SessionResult {
  return {
    id: row.id,
    topic: row.topic,
    dayNumber: row.day_number,
    accuracy: row.accuracy,
    confidence: row.confidence as ConfidenceLevel,
    durationMinutes: row.duration_minutes,
    mistakes: mistakes.map((m) => ({
      question: m.question,
      userAnswer: m.user_answer,
      correctAnswer: m.correct_answer,
      pattern: m.pattern,
    })),
    insight: row.insight,
    nextRecommendation: row.next_recommendation,
    createdAt: new Date(row.created_at).getTime(),
  };
}
