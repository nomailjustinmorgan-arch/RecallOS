import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Brain, TrendingUp, Calendar, Target, ArrowRight, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  computeOverallMastery,
  getAdaptiveInsight,
  getUpcomingRecommendation,
} from '@/lib/studyEngine';

interface DashboardPageProps {
  onGoToMission: () => void;
}

export function DashboardPage({ onGoToMission }: DashboardPageProps) {
  const { state } = useApp();

  if (!state.plan) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <p className="text-neutral-500">No plan found.</p>
      </div>
    );
  }

  const overallMastery = computeOverallMastery(state.topics);
  const adaptiveInsight = getAdaptiveInsight(state.topics, state.sessions, state.plan);
  const upcoming = getUpcomingRecommendation(
    state.topics,
    state.sessions,
    state.currentDay,
    state.plan.dailyMinutes,
  );

  const recentSessions = [...state.sessions].reverse().slice(0, 5);
  const avgAccuracy =
    state.sessions.length > 0
      ? Math.round(state.sessions.reduce((s, sess) => s + sess.accuracy, 0) / state.sessions.length)
      : 0;

  const sortedTopics = [...state.topics].sort((a, b) => b.mastery - a.mastery);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-12 animate-fade-in-up">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            Progress Dashboard
          </h1>
          <p className="mt-2 text-base text-neutral-500">
            {state.plan.subject} · {state.plan.goal}
          </p>
        </div>
        <Button size="md" onClick={onGoToMission} className="group hidden sm:inline-flex">
          Today's Mission
          <ArrowRight size={16} strokeWidth={2} className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Mastery ring */}
        <Card className="p-8 flex flex-col items-center justify-center animate-fade-in-up delay-100" hover>
          <ProgressRing
            value={overallMastery}
            size={140}
            strokeWidth={10}
            label={`${overallMastery}%`}
            sublabel="Estimated Mastery"
          />
        </Card>

        {/* Quick stats */}
        <Card className="p-7 animate-fade-in-up delay-200">
          <div className="space-y-5">
            <StatRow icon={Target} label="Average accuracy" value={`${avgAccuracy}%`} />
            <StatRow icon={Calendar} label="Sessions completed" value={state.sessions.length.toString()} />
            <StatRow icon={Brain} label="Topics in plan" value={state.topics.length.toString()} />
            <StatRow
              icon={TrendingUp}
              label="Topics at 70%+ mastery"
              value={state.topics.filter((t) => t.mastery >= 70).length.toString()}
            />
          </div>
        </Card>

        {/* Adaptive insight */}
        <Card className="p-7 animate-fade-in-up delay-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center">
              <Sparkles size={15} strokeWidth={2} className="text-white" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-neutral-900 uppercase">Adaptive Insight</h3>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed">{adaptiveInsight}</p>
        </Card>
      </div>

      {/* Topic breakdown */}
      <Card className="p-8 mb-6 animate-fade-in-up delay-300">
        <h3 className="text-sm font-semibold tracking-tight text-neutral-900 uppercase mb-6">Topic Breakdown</h3>
        <div className="space-y-4">
          {sortedTopics.map((topic, i) => (
            <div key={topic.name} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-neutral-900">{topic.name}</span>
                  {topic.isWeak && (
                    <span className="text-xs font-medium text-warning-600 px-2 py-0.5 rounded bg-warning-50">
                      Weak
                    </span>
                  )}
                  {topic.sessionsCompleted > 0 && (
                    <span className="text-xs text-neutral-400">
                      {topic.sessionsCompleted} session{topic.sessionsCompleted > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums text-neutral-700">{topic.mastery}%</span>
              </div>
              <ProgressBar
                value={topic.mastery}
                color={topic.mastery >= 70 ? 'success' : topic.mastery >= 40 ? 'neutral' : 'warning'}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Recent sessions + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent sessions */}
        <Card className="p-7 animate-fade-in-up delay-400">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 uppercase mb-5">Recent Sessions</h3>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">
              No sessions yet. Complete your first session to see history here.
            </p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-neutral-50 border border-neutral-100"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      session.accuracy >= 75 ? 'bg-success-50 text-success-600' :
                      session.accuracy >= 50 ? 'bg-warning-50 text-warning-600' :
                      'bg-error-50 text-error-600'
                    }`}>
                      <span className="text-xs font-semibold">{session.accuracy}%</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{session.topic}</p>
                      <p className="text-xs text-neutral-400">Day {session.dayNumber} · {session.durationMinutes}m</p>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 capitalize">{session.confidence}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming recommendation */}
        <Card className="p-7 animate-fade-in-up delay-500">
          <div className="flex items-center gap-2 mb-5">
            <ArrowRight size={16} strokeWidth={2} className="text-neutral-400" />
            <h3 className="text-sm font-semibold tracking-tight text-neutral-900 uppercase">Upcoming Recommendation</h3>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">{upcoming}</p>
          <Button variant="secondary" fullWidth onClick={onGoToMission}>
            Go to Today's Mission
            <ArrowRight size={16} strokeWidth={2} className="ml-2" />
          </Button>
        </Card>
      </div>

      {/* Mobile CTA */}
      <div className="sm:hidden">
        <Button fullWidth size="lg" onClick={onGoToMission}>
          Today's Mission
          <ArrowRight size={18} strokeWidth={2} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
          <Icon size={14} strokeWidth={2} className="text-neutral-500" />
        </div>
        <span className="text-sm text-neutral-600">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums text-neutral-900">{value}</span>
    </div>
  );
}
