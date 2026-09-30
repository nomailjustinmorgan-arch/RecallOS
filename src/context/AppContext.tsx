import { createContext, useContext, useReducer, useCallback, useState, type ReactNode } from 'react';
import type { AdaptivePlan, AppState, NeuralStatus, SessionResult, StudyPlan, TopicState, View } from '@/types';
import {
  applySessionToTopics,
  createInitialTopics,
  generateSessionQuestions,
  generateSessionResult,
  getInitialState,
  selectTodayTopic,
} from '@/lib/studyEngine';
import type { ConfidenceLevel, SessionQuestion } from '@/types';
import {
  deletePlan,
  saveAdaptivePlan,
  saveNewPlan,
  saveSessionResult,
} from '@/lib/dataAccess';
import {
  getAdaptiveRecommendation,
  initializeNeuralSchema,
  persistAdaptivePlan,
  persistLearnerSetup,
  persistLearningTopics,
  persistSessionResult,
  selectLearnerSessions,
  updateTopicState,
} from '@/lib/neuralPulse';

let schemaInitialized = false;

type Action =
  | { type: 'SET_VIEW'; view: View }
  | { type: 'CREATE_PLAN'; plan: StudyPlan; topics: TopicState[] }
  | { type: 'START_SESSION'; topic: string; questions: SessionQuestion[] }
  | { type: 'ANSWER_QUESTION'; index: number; answer: number }
  | { type: 'SAVE_SESSION_RESULT'; result: SessionResult; updatedTopics: TopicState[] }
  | { type: 'LOAD_STATE'; partial: Partial<AppState> }
  | { type: 'SET_ADAPTIVE_PLAN'; plan: AdaptivePlan | null }
  | { type: 'SET_NEURAL_STATUS'; status: NeuralStatus; error: string | null }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return state;
    case 'CREATE_PLAN':
      return {
        ...state,
        plan: action.plan,
        topics: action.topics,
        currentDay: 1,
        neuralStatus: 'idle',
        neuralError: null,
      };
    case 'START_SESSION':
      return {
        ...state,
        currentSession: {
          topic: action.topic,
          questions: action.questions,
          answers: new Array(action.questions.length).fill(-1),
          startTime: Date.now(),
        },
      };
    case 'ANSWER_QUESTION':
      if (!state.currentSession) return state;
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          answers: state.currentSession.answers.map((a, i) =>
            i === action.index ? action.answer : a,
          ),
        },
      };
    case 'SAVE_SESSION_RESULT':
      return {
        ...state,
        topics: action.updatedTopics,
        sessions: [...state.sessions, action.result],
        currentDay: state.currentDay + 1,
        currentSession: null,
      };
    case 'LOAD_STATE':
      return { ...state, ...action.partial };
    case 'SET_ADAPTIVE_PLAN':
      return { ...state, adaptivePlan: action.plan };
    case 'SET_NEURAL_STATUS':
      return { ...state, neuralStatus: action.status, neuralError: action.error };
    case 'RESET':
      return getInitialState();
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  planId: string | null;
  topicIds: Map<string, string>;
  setView: (view: View) => void;
  createPlan: (plan: StudyPlan) => Promise<void>;
  startSession: (topic: string) => void;
  answerQuestion: (index: number, answer: number) => void;
  saveSession: (confidence: ConfidenceLevel) => SessionResult | null;
  reset: () => Promise<void>;
  getTodayMission: () => { topic: TopicState; reason: string } | null;
  fetchAdaptiveRecommendation: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  const [planId, setPlanId] = useState<string | null>(null);
  const [topicIds, setTopicIds] = useState<Map<string, string>>(new Map());

  const setNeuralStatus = useCallback((status: NeuralStatus, error: string | null = null) => {
    dispatch({ type: 'SET_NEURAL_STATUS', status, error });
  }, []);

  const createPlan = useCallback(async (plan: StudyPlan) => {
    const topics = createInitialTopics(plan);
    const result = await saveNewPlan(plan, topics);
    if (result) {
      setPlanId(result.planId);
      setTopicIds(result.topicIds);
      dispatch({ type: 'CREATE_PLAN', plan, topics });

      // Schema init — guarded by module-level flag to avoid repeated calls
      if (!schemaInitialized) {
        schemaInitialized = true;
        void initializeNeuralSchema().then((schemaResult) => {
          if (import.meta.env.DEV && schemaResult.traceId) {
            console.log(`[NeuralPulse] schema init traceId=${schemaResult.traceId}`);
          }
          if (schemaResult.error && import.meta.env.DEV) {
            console.warn('[NeuralPulse] schema init failed (non-blocking):', schemaResult.error);
          }
        });
      }

      // Persist learner to Neural Pulse
      void persistLearnerSetup({
        id: result.planId,
        subject: plan.subject,
        goal: plan.goal,
        days_remaining: plan.daysRemaining,
        daily_minutes: plan.dailyMinutes,
        weak_topics: plan.weakTopics,
        current_day: 1,
      }).then((learnerResult) => {
        if (import.meta.env.DEV && learnerResult.traceId) {
          console.log(`[NeuralPulse] learner setup traceId=${learnerResult.traceId}`);
        }
      });

      // Persist learning topics to Neural Pulse
      void persistLearningTopics(
        topics.map((t, i) => ({
          id: `${result.planId}-topic-${i}`,
          learner_id: result.planId,
          name: t.name,
          mastery: t.mastery,
          confidence: t.confidence,
          sessions_completed: t.sessionsCompleted,
          last_studied: null,
          is_weak: t.isWeak,
        })),
      ).then((topicsResult) => {
        if (import.meta.env.DEV) {
          console.log('[NeuralPulse] learning topics persisted');
        }
        void topicsResult;
      });
    }
  }, []);

  const startSession = useCallback((topic: string) => {
    const questions = generateSessionQuestions(topic);
    dispatch({ type: 'START_SESSION', topic, questions });
  }, []);

  const answerQuestion = useCallback((index: number, answer: number) => {
    dispatch({ type: 'ANSWER_QUESTION', index, answer });
  }, []);

  const fetchAdaptiveRecommendation = useCallback(async () => {
    if (!state.plan || !planId) return;

    setNeuralStatus('loading');

    // Retrieve learner history from Neural Pulse before reasoning
    void selectLearnerSessions(planId).then((historyResult) => {
      if (import.meta.env.DEV && historyResult.traceId) {
        console.log(`[NeuralPulse] select sessions traceId=${historyResult.traceId}`);
      }
    });

    const result = await getAdaptiveRecommendation({
      learnerId: planId,
      subject: state.plan.subject,
      goal: state.plan.goal,
      daysRemaining: state.plan.daysRemaining,
      dailyMinutes: state.plan.dailyMinutes,
      currentDay: state.currentDay,
      topics: state.topics.map((t) => ({
        name: t.name,
        mastery: t.mastery,
        confidence: t.confidence,
        sessionsCompleted: t.sessionsCompleted,
        isWeak: t.isWeak,
      })),
      recentSessions: state.sessions.map((s) => ({
        topic: s.topic,
        accuracy: s.accuracy,
        confidence: s.confidence,
        dayNumber: s.dayNumber,
      })),
    });

    if (result.error) {
      const status: NeuralStatus = result.error.code === 'TIMEOUT' ? 'timeout' : 'error';
      setNeuralStatus(status, result.error.error);

      if (import.meta.env.DEV) {
        console.warn('[NeuralPulse] adaptive recommendation failed:', result.error);
      }

      // Fallback to local engine recommendation
      const fallback = selectTodayTopic(
        state.topics,
        state.sessions,
        state.currentDay,
        state.plan.dailyMinutes,
      );
      const fallbackPlan: AdaptivePlan = {
        priorityTopic: fallback.topic.name,
        recommendedActivity: `Study session on ${fallback.topic.name}`,
        reasoning: fallback.reason,
        estimatedDuration: state.plan.dailyMinutes,
        adaptationNotes: 'Using local fallback — Neural Pulse unavailable.',
        traceId: result.traceId,
        createdAt: Date.now(),
      };
      dispatch({ type: 'SET_ADAPTIVE_PLAN', plan: fallbackPlan });
      return;
    }

    if (result.recommendation) {
      const adaptivePlan: AdaptivePlan = {
        priorityTopic: result.recommendation.priorityTopic,
        recommendedActivity: result.recommendation.recommendedActivity,
        reasoning: result.recommendation.reasoning,
        estimatedDuration: result.recommendation.estimatedDuration || state.plan.dailyMinutes,
        adaptationNotes: result.recommendation.adaptationNotes,
        traceId: result.traceId,
        createdAt: Date.now(),
      };

      dispatch({ type: 'SET_ADAPTIVE_PLAN', plan: adaptivePlan });
      setNeuralStatus('success');

      // Persist to Supabase (local cache) and Neural Pulse
      void saveAdaptivePlan(planId, adaptivePlan, state.currentDay);
      void persistAdaptivePlan({
        id: crypto.randomUUID(),
        learner_id: planId,
        priority_topic: adaptivePlan.priorityTopic,
        recommended_activity: adaptivePlan.recommendedActivity,
        reasoning: adaptivePlan.reasoning,
        estimated_duration: adaptivePlan.estimatedDuration,
        adaptation_notes: adaptivePlan.adaptationNotes,
        day_number: state.currentDay,
        trace_id: adaptivePlan.traceId,
        created_at: new Date(adaptivePlan.createdAt).toISOString(),
      });
    }
  }, [state, planId, setNeuralStatus]);

  const saveSession = useCallback(
    (confidence: ConfidenceLevel): SessionResult | null => {
      if (!state.currentSession) return null;
      const result = generateSessionResult(
        state.currentSession.topic,
        state.currentDay,
        state.currentSession.questions,
        state.currentSession.answers,
        confidence,
      );
      const updatedTopics = applySessionToTopics(state.topics, result);
      dispatch({ type: 'SAVE_SESSION_RESULT', result, updatedTopics });

      const topicId = topicIds.get(result.topic);
      const updatedTopic = updatedTopics.find((t) => t.name === result.topic);

      if (planId && topicId && updatedTopic) {
        // Persist to Supabase
        void saveSessionResult(planId, result.topic, result, updatedTopic, topicId);

        // Persist session to Neural Pulse
        void persistSessionResult({
          id: crypto.randomUUID(),
          learner_id: planId,
          topic: result.topic,
          accuracy: result.accuracy,
          confidence: result.confidence,
          duration_minutes: result.durationMinutes,
          mistakes: result.mistakes,
          insight: result.insight,
          next_recommendation: result.nextRecommendation,
          day_number: result.dayNumber,
          created_at: new Date(result.createdAt).toISOString(),
        });

        // Update topic state in Neural Pulse
        void updateTopicState(planId, result.topic, {
          mastery: updatedTopic.mastery,
          confidence: updatedTopic.confidence,
          sessions_completed: updatedTopic.sessionsCompleted,
          last_studied: new Date(result.createdAt).toISOString(),
          is_weak: updatedTopic.isWeak,
        });
      }
      return result;
    },
    [state, planId, topicIds],
  );

  const reset = useCallback(async () => {
    if (planId) {
      await deletePlan(planId);
    }
    setPlanId(null);
    setTopicIds(new Map());
    dispatch({ type: 'RESET' });
  }, [planId]);

  const getTodayMission = useCallback(() => {
    if (!state.plan || state.topics.length === 0) return null;

    // If we have a Neural Pulse adaptive plan, use it
    if (state.adaptivePlan) {
      const topic = state.topics.find(
        (t) => t.name.toLowerCase() === state.adaptivePlan!.priorityTopic.toLowerCase(),
      );
      if (topic) {
        return {
          topic,
          reason: state.adaptivePlan.reasoning,
        };
      }
      // If the AI recommended a topic not in our list, use the closest match or fall back
      const fallbackTopic = selectTodayTopic(
        state.topics,
        state.sessions,
        state.currentDay,
        state.plan.dailyMinutes,
      );
      return {
        topic: fallbackTopic.topic,
        reason: state.adaptivePlan.reasoning || fallbackTopic.reason,
      };
    }

    return selectTodayTopic(
      state.topics,
      state.sessions,
      state.currentDay,
      state.plan.dailyMinutes,
    );
  }, [state]);

  const value: AppContextValue = {
    state,
    planId,
    topicIds,
    setView: (view) => dispatch({ type: 'SET_VIEW', view }),
    createPlan,
    startSession,
    answerQuestion,
    saveSession,
    reset,
    getTodayMission,
    fetchAdaptiveRecommendation,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
