import type {
  AppState,
  ConfidenceLevel,
  Mistake,
  SessionQuestion,
  SessionResult,
  StudyPlan,
  TopicState,
} from '@/types';

const SAMPLE_TOPICS: Record<string, string[]> = {
  Mathematics: ['Algebra', 'Geometry', 'Calculus', 'Trigonometry', 'Statistics', 'Probability', 'Number Theory'],
  Physics: ['Mechanics', 'Thermodynamics', 'Waves & Optics', 'Electricity', 'Magnetism', 'Modern Physics'],
  Chemistry: ['Atomic Structure', 'Chemical Bonding', 'Organic Chemistry', 'Thermodynamics', 'Equilibrium', 'Electrochemistry'],
  Biology: ['Cell Biology', 'Genetics', 'Ecology', 'Human Physiology', 'Evolution', 'Plant Biology'],
  'Computer Science': ['Data Structures', 'Algorithms', 'Databases', 'Operating Systems', 'Networking', 'Machine Learning'],
  History: ['Ancient Civilizations', 'Medieval Period', 'Renaissance', 'Industrial Revolution', 'World Wars', 'Cold War'],
  Literature: ['Poetry Analysis', 'Shakespeare', 'Modern Fiction', 'Literary Theory', 'Narrative Structure', 'Themes & Motifs'],
  Economics: ['Microeconomics', 'Macroeconomics', 'International Trade', 'Game Theory', 'Fiscal Policy', 'Market Structures'],
  Psychology: ['Cognitive Psychology', 'Behavioral Studies', 'Developmental Psychology', 'Social Psychology', 'Neuroscience', 'Research Methods'],
  General: ['Critical Thinking', 'Problem Solving', 'Reading Comprehension', 'Analytical Reasoning', 'Data Interpretation', 'Logical Reasoning'],
};

export function getTopicsForSubject(subject: string): string[] {
  const normalized = subject.trim();
  for (const key of Object.keys(SAMPLE_TOPICS)) {
    if (normalized.toLowerCase().includes(key.toLowerCase())) {
      return SAMPLE_TOPICS[key];
    }
  }
  return SAMPLE_TOPICS['General'];
}

export function createInitialTopics(plan: StudyPlan): TopicState[] {
  const topicNames = getTopicsForSubject(plan.subject);
  return topicNames.map((name) => ({
    name,
    mastery: 0,
    confidence: 'low' as ConfidenceLevel,
    sessionsCompleted: 0,
    lastStudied: null,
    isWeak: plan.weakTopics.some((w) => name.toLowerCase().includes(w.toLowerCase().trim())),
  }));
}

export function selectTodayTopic(
  topics: TopicState[],
  sessions: SessionResult[],
  dayNumber: number,
  dailyMinutes: number,
): { topic: TopicState; reason: string } {
  const unstudied = topics.filter((t) => t.sessionsCompleted === 0);
  const weak = topics.filter((t) => t.isWeak && t.mastery < 70);
  const lowConfidence = topics.filter((t) => t.confidence === 'low' && t.sessionsCompleted > 0);
  const dueForReview = topics
    .filter((t) => t.lastStudied !== null)
    .sort((a, b) => (a.lastStudied ?? 0) - (b.lastStudied ?? 0));

  if (weak.length > 0) {
    const target = weak.sort((a, b) => a.mastery - b.mastery)[0];
    return {
      topic: target,
      reason: `"${target.name}" is flagged as a weak area with ${target.mastery}% mastery. Strengthening this first creates a stronger foundation for the rest of your plan.`,
    };
  }

  if (unstudied.length > 0) {
    const target = unstudied[0];
    return {
      topic: target,
      reason: `You haven't studied "${target.name}" yet. Starting new topics early gives you more time to reinforce them before your goal deadline.`,
    };
  }

  if (lowConfidence.length > 0) {
    const target = lowConfidence.sort((a, b) => a.mastery - b.mastery)[0];
    return {
      topic: target,
      reason: `Your confidence on "${target.name}" is still low despite ${target.sessionsCompleted} session${target.sessionsCompleted > 1 ? 's' : ''}. Revisiting it now while it's fresh will help consolidate your memory.`,
    };
  }

  if (dueForReview.length > 0) {
    const target = dueForReview[0];
    const daysSince = target.lastStudied
      ? Math.floor((Date.now() - target.lastStudied) / (1000 * 60 * 60 * 24))
      : 0;
    return {
      topic: target,
      reason: `"${target.name}" was last studied ${daysSince} day${daysSince !== 1 ? 's' : ''} ago. Spaced repetition is most effective when you review just before forgetting — this is the optimal window.`,
    };
  }

  const target = topics[0];
  return {
    topic: target,
    reason: `Continuing with "${target.name}" to build consistency. Daily practice, even for ${dailyMinutes} minutes, compounds over time.`,
  };
}

const QUESTION_BANK: Record<string, { prompt: string; options: string[]; correct: number }[]> = {
  default: [
    { prompt: 'Which best describes the fundamental concept of this topic?', options: ['A foundational principle that other ideas build upon', 'An isolated fact with no connections', 'A memorization exercise', 'A historical anecdote'], correct: 0 },
    { prompt: 'If you apply this concept to a new problem, what is the first step?', options: ['Guess randomly', 'Identify which principle applies', 'Skip to the answer', 'Look for a formula to memorize'], correct: 1 },
    { prompt: 'What distinguishes a strong understanding from surface knowledge?', options: ['Knowing more facts', 'Being able to explain and transfer the idea', 'Reading faster', 'Having a bigger textbook'], correct: 1 },
    { prompt: 'Which approach best reinforces long-term retention?', options: ['Cramming once', 'Spaced repetition with active recall', 'Re-reading notes passively', 'Highlighting text'], correct: 1 },
    { prompt: 'When you encounter a mistake in this area, what should you do?', options: ['Move on immediately', 'Analyze the pattern behind the error', 'Memorize the correct answer only', 'Avoid the topic'], correct: 1 },
  ],
};

export function generateSessionQuestions(topic: string, count: number = 5): SessionQuestion[] {
  const bank = QUESTION_BANK['default'];
  const selected = bank.slice(0, count);
  return selected.map((q, i) => ({
    id: `q-${Date.now()}-${i}`,
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.correct,
    topic,
  }));
}

const INSIGHT_TEMPLATES = [
  (acc: number) => acc >= 80
    ? 'Strong performance. Your pattern recognition in this topic is solid — focus on speed and edge cases next.'
    : acc >= 60
      ? 'Good progress. You understand the core ideas but have gaps in application — targeted practice on missed patterns will close them.'
      : 'Foundational work needed. Prioritize understanding the "why" behind each concept before moving to complex problems.',
  (acc: number) => acc >= 75
    ? 'Your accuracy suggests this topic is moving from short-term to long-term memory. A review in 2-3 days will cement it.'
    : 'Active recall is working but needs reinforcement. Short, frequent sessions will be more effective than long ones here.',
];

const NEXT_REC_TEMPLATES = [
  'Continue with a short review session tomorrow, then move to the next topic in your plan.',
  'Revisit this topic in 2 days with a focus on the patterns you missed today.',
  'You\'re ready to advance — the next topic builds on this one, so keep these notes handy.',
  'Take a lighter session tomorrow to let this consolidate, then tackle a new topic.',
  'Focus your next session on the specific mistake patterns identified — quality over quantity.',
];

export function generateSessionResult(
  topic: string,
  dayNumber: number,
  questions: SessionQuestion[],
  answers: number[],
  confidence: ConfidenceLevel,
): SessionResult {
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  const accuracy = Math.round((correct / questions.length) * 100);
  const durationMinutes = Math.max(1, Math.round((Date.now() - Date.now()) / 60000) + 5 + Math.round(Math.random() * 10));

  const mistakes: Mistake[] = questions
    .map((q, i) => {
      if (answers[i] === q.correctIndex) return null;
      return {
        question: q.prompt,
        userAnswer: q.options[answers[i]] ?? 'No answer',
        correctAnswer: q.options[q.correctIndex],
        pattern: 'Application gap — the core concept was understood but not correctly applied to this context.',
      };
    })
    .filter((m): m is Mistake => m !== null);

  const insightTemplate = INSIGHT_TEMPLATES[accuracy >= 75 ? 0 : 1];
  const insight = insightTemplate(accuracy);
  const nextRecommendation = NEXT_REC_TEMPLATES[Math.floor(Math.random() * NEXT_REC_TEMPLATES.length)];

  return {
    id: `s-${Date.now()}`,
    topic,
    dayNumber,
    accuracy,
    confidence,
    durationMinutes,
    mistakes,
    insight,
    nextRecommendation,
    createdAt: Date.now(),
  };
}

export function applySessionToTopics(
  topics: TopicState[],
  result: SessionResult,
): TopicState[] {
  return topics.map((t) => {
    if (t.name !== result.topic) return t;
    const newSessions = t.sessionsCompleted + 1;
    const masteryDelta = result.accuracy >= 80 ? 15 : result.accuracy >= 60 ? 8 : 3;
    const newMastery = Math.min(100, t.mastery + masteryDelta);
    const newConfidence: ConfidenceLevel =
      newMastery >= 75 ? 'high' : newMastery >= 40 ? 'medium' : 'low';
    return {
      ...t,
      mastery: newMastery,
      confidence: newConfidence,
      sessionsCompleted: newSessions,
      lastStudied: result.createdAt,
      isWeak: t.isWeak && newMastery < 70,
    };
  });
}

export function computeOverallMastery(topics: TopicState[]): number {
  if (topics.length === 0) return 0;
  return Math.round(topics.reduce((sum, t) => sum + t.mastery, 0) / topics.length);
}

export function getAdaptiveInsight(
  topics: TopicState[],
  sessions: SessionResult[],
  plan: StudyPlan,
): string {
  const overall = computeOverallMastery(topics);
  const totalSessions = sessions.length;
  const avgAccuracy =
    sessions.length > 0
      ? Math.round(sessions.reduce((s, sess) => s + sess.accuracy, 0) / sessions.length)
      : 0;

  if (totalSessions === 0) {
    return 'Your adaptive profile is initializing. Complete your first session to unlock personalized recommendations.';
  }

  const weakCount = topics.filter((t) => t.mastery < 40).length;
  const strongCount = topics.filter((t) => t.mastery >= 75).length;

  if (weakCount > topics.length / 2) {
    return `You have ${weakCount} topics below 40% mastery. Your plan is adjusting to prioritize foundational work over new topics until your base is solid.`;
  }

  if (strongCount >= topics.length / 2 && avgAccuracy >= 75) {
    return `Excellent trajectory — ${strongCount} topics are at or near mastery. Your plan is accelerating to introduce harder problems and cross-topic synthesis.`;
  }

  if (avgAccuracy < 60) {
    return `Your average accuracy is ${avgAccuracy}%. The system is slowing the pace and increasing review frequency to strengthen retention before introducing new material.`;
  }

  const daysElapsed = Math.ceil((Date.now() - plan.createdAt) / (1000 * 60 * 60 * 24));
  const pace = totalSessions / Math.max(1, daysElapsed);
  if (pace < 0.7) {
    return `You're studying at ${pace.toFixed(1)} sessions/day. To reach your goal in ${plan.daysRemaining} days, try to maintain at least one session per day.`;
  }

  return `You're on a strong pace with ${overall}% overall mastery and ${avgAccuracy}% average accuracy. Your plan is balancing new topics with spaced review for optimal retention.`;
}

export function getUpcomingRecommendation(
  topics: TopicState[],
  sessions: SessionResult[],
  dayNumber: number,
  dailyMinutes: number,
): string {
  if (topics.length === 0) return 'Complete setup to get recommendations.';
  const { topic, reason } = selectTodayTopic(topics, sessions, dayNumber + 1, dailyMinutes);
  return `Next: ${topic.name} — ${reason.split('.')[0]}.`;
}

export function getInitialState(): AppState {
  return {
    plan: null,
    topics: [],
    sessions: [],
    currentDay: 1,
    currentSession: null,
    adaptivePlan: null,
    neuralStatus: 'idle',
    neuralError: null,
  };
}
