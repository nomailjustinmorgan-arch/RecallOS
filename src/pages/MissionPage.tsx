import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Calendar, Clock, Lightbulb, Play, ListChecks, ArrowRight, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface MissionPageProps {
  onBegin: () => void;
  onGoToDashboard: () => void;
}

export function MissionPage({ onBegin, onGoToDashboard }: MissionPageProps) {
  const { state, getTodayMission, startSession, fetchAdaptiveRecommendation } = useApp();
  const [hasFetched, setHasFetched] = useState(false);

  const mission = getTodayMission();

  useEffect(() => {
    if (state.plan && !hasFetched && state.neuralStatus === 'idle') {
      setHasFetched(true);
      void fetchAdaptiveRecommendation();
    }
  }, [state.plan, hasFetched, state.neuralStatus, fetchAdaptiveRecommendation]);

  // Reset fetch flag when plan changes
  useEffect(() => {
    setHasFetched(false);
  }, [state.plan]);

  if (!state.plan || !mission) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <p className="text-neutral-500">No plan found. Create a plan to get started.</p>
      </div>
    );
  }

  const { plan } = state;
  const { topic, reason } = mission;
  const isNeuralLoading = state.neuralStatus === 'loading';
  const isNeuralError = state.neuralStatus === 'error' || state.neuralStatus === 'timeout';
  const isNeuralActive = state.neuralStatus === 'success' && state.adaptivePlan !== null;

  const estimatedDuration = state.adaptivePlan?.estimatedDuration ?? plan.dailyMinutes;

  const sessionStructure = [
    { phase: 'Warm-up', description: 'Quick recall of prior concepts', minutes: Math.max(3, Math.round(estimatedDuration * 0.15)) },
    { phase: 'Core practice', description: 'Active recall questions on the selected topic', minutes: Math.round(estimatedDuration * 0.55) },
    { phase: 'Mistake review', description: 'Review and understand any errors', minutes: Math.round(estimatedDuration * 0.2) },
    { phase: 'Consolidation', description: 'Summarize key takeaways', minutes: Math.max(2, Math.round(estimatedDuration * 0.1)) },
  ];

  function handleBegin() {
    startSession(topic.name);
    onBegin();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Day indicator */}
      <div className="flex items-center gap-3 mb-8 animate-fade-in">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100">
          <Calendar size={14} strokeWidth={2} className="text-neutral-500" />
          <span className="text-xs font-semibold tracking-tight text-neutral-700">Day {state.currentDay}</span>
        </div>
        <span className="text-xs text-neutral-400">
          {plan.daysRemaining - state.currentDay + 1} days remaining to your goal
        </span>
        {isNeuralActive && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white">
            <Sparkles size={12} strokeWidth={2} />
            <span className="text-xs font-medium tracking-tight">Neural Pulse</span>
          </span>
        )}
      </div>

      {/* Main mission card */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 mb-2">
          Today's Mission
        </h1>
        <p className="text-base text-neutral-500 mb-10">
          RecallOS has selected today's focus based on your adaptive profile.
        </p>
      </div>

      {/* Topic card */}
      <Card className="p-8 mb-6 animate-fade-in-up delay-200" hover>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-medium tracking-tight text-neutral-400 uppercase mb-2">Selected Topic</p>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">{topic.name}</h2>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100">
              <Clock size={12} strokeWidth={2} className="text-neutral-500" />
              <span className="text-xs font-medium text-neutral-700">~{estimatedDuration} min</span>
            </div>
            {topic.isWeak && (
              <span className="text-xs font-medium text-warning-600 px-3 py-1 rounded-lg bg-warning-50">
                Weak area
              </span>
            )}
          </div>
        </div>

        {/* Why this topic — with Neural Pulse loading/error states */}
        <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center flex-shrink-0">
              {isNeuralLoading ? (
                <Loader2 size={15} strokeWidth={2} className="text-neutral-400 animate-spin" />
              ) : isNeuralError ? (
                <AlertCircle size={15} strokeWidth={2} className="text-neutral-400" />
              ) : isNeuralActive ? (
                <Sparkles size={15} strokeWidth={2} className="text-neutral-900" />
              ) : (
                <Lightbulb size={15} strokeWidth={2} className="text-neutral-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-xs font-semibold tracking-tight text-neutral-700 uppercase">
                  {isNeuralLoading
                    ? 'Neural Pulse analyzing your profile...'
                    : isNeuralError
                      ? 'Adaptive Insight (Offline Mode)'
                      : isNeuralActive
                        ? 'Neural Pulse Recommendation'
                        : 'Why this topic was selected'}
                </p>
              </div>
              {isNeuralLoading ? (
                <div className="space-y-2">
                  <div className="h-3 bg-neutral-200 rounded animate-pulse" style={{ width: '85%' }} />
                  <div className="h-3 bg-neutral-200 rounded animate-pulse" style={{ width: '70%' }} />
                </div>
              ) : (
                <p className="text-sm text-neutral-600 leading-relaxed">{reason}</p>
              )}
            </div>
          </div>
        </div>

        {/* Neural Pulse adaptation notes */}
        {isNeuralActive && state.adaptivePlan?.adaptationNotes && (
          <div className="mt-4 p-4 rounded-xl bg-neutral-900 text-white">
            <div className="flex items-start gap-3">
              <Sparkles size={14} strokeWidth={2} className="text-white/70 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium tracking-tight text-white/50 uppercase mb-1">Adaptation Notes</p>
                <p className="text-sm text-white/90 leading-relaxed">{state.adaptivePlan.adaptationNotes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error retry */}
        {isNeuralError && (
          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-error-50 border border-error-100">
            <p className="text-xs text-error-600">
              {state.neuralError || 'Neural Pulse unavailable'} — using local fallback
            </p>
            <button
              onClick={() => void fetchAdaptiveRecommendation()}
              className="text-xs font-medium text-error-600 hover:text-error-700 underline"
            >
              Retry
            </button>
          </div>
        )}
      </Card>

      {/* Session structure */}
      <Card className="p-8 mb-6 animate-fade-in-up delay-300">
        <div className="flex items-center gap-2 mb-5">
          <ListChecks size={18} strokeWidth={2} className="text-neutral-400" />
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 uppercase">Recommended Session Structure</h3>
        </div>
        <div className="space-y-1">
          {sessionStructure.map((step, i) => (
            <div
              key={step.phase}
              className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-neutral-50 transition-colors duration-200 group"
            >
              <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-900 group-hover:text-white transition-colors duration-200">
                <span className="text-xs font-semibold">{i + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900">{step.phase}</p>
                <p className="text-xs text-neutral-400">{step.description}</p>
              </div>
              <span className="text-xs font-medium text-neutral-500 tabular-nums">{step.minutes} min</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Current state summary */}
      <Card className="p-6 mb-8 animate-fade-in-up delay-400">
        <div className="grid grid-cols-3 divide-x divide-neutral-100">
          <Stat label="Sessions completed" value={state.sessions.length.toString()} />
          <Stat label="Topics started" value={state.topics.filter((t) => t.sessionsCompleted > 0).length.toString()} />
          <Stat label="Current mastery" value={`${Math.round(state.topics.reduce((s, t) => s + t.mastery, 0) / Math.max(1, state.topics.length))}%`} />
        </div>
      </Card>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center gap-3 animate-fade-in-up delay-500">
        <Button size="lg" onClick={handleBegin} disabled={isNeuralLoading} className="group w-full sm:w-auto">
          <Play size={18} strokeWidth={2} className="mr-2" />
          {isNeuralLoading ? 'Preparing...' : 'Begin Session'}
        </Button>
        <Button size="lg" variant="secondary" onClick={onGoToDashboard} className="w-full sm:w-auto">
          View Progress
          <ArrowRight size={18} strokeWidth={2} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center px-2">
      <p className="text-xl font-semibold tracking-tight text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-400 mt-1">{label}</p>
    </div>
  );
}
