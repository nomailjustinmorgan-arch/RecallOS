import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Target, Clock, AlertTriangle, Lightbulb, ArrowRight, Save, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import type { SessionResult } from '@/types';
import type { ConfidenceLevel } from '@/types';
import { useApp } from '@/context/AppContext';

interface ResultPageProps {
  result: SessionResult;
  onSave: (confidence: ConfidenceLevel) => void;
  onGoToDashboard: () => void;
}

export function ResultPage({ result, onSave, onGoToDashboard }: ResultPageProps) {
  const [saved, setSaved] = useState(false);
  const [confidence, setConfidence] = useState<ConfidenceLevel>('medium');
  const { state } = useApp();

  const accuracyColor =
    result.accuracy >= 75 ? 'text-success-600' : result.accuracy >= 50 ? 'text-warning-600' : 'text-error-600';

  const isNeuralLoading = state.neuralStatus === 'loading';
  const isNeuralError = state.neuralStatus === 'error' || state.neuralStatus === 'timeout';
  const isNeuralActive = state.neuralStatus === 'success' && state.adaptivePlan !== null;
  const nextRecommendation = isNeuralActive && state.adaptivePlan
    ? state.adaptivePlan.recommendedActivity || state.adaptivePlan.reasoning
    : result.nextRecommendation;

  function handleSave() {
    onSave(confidence);
    setSaved(true);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <p className="text-xs font-semibold tracking-tight text-neutral-400 uppercase mb-2">Session Complete · Day {result.dayNumber}</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            {result.topic}
          </h1>
        </div>

        {/* Accuracy ring */}
        <div className="flex flex-col items-center mb-12 animate-scale-in">
          <ProgressRing
            value={result.accuracy}
            size={160}
            strokeWidth={10}
            label={`${result.accuracy}%`}
            sublabel="Accuracy"
          />
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in-up delay-200">
          <MetricCard
            icon={Target}
            label="Accuracy"
            value={`${result.accuracy}%`}
            valueClass={accuracyColor}
          />
          <MetricCard
            icon={Clock}
            label="Duration"
            value={`${result.durationMinutes}m`}
          />
          <MetricCard
            icon={TrendingUp}
            label="Confidence"
            value={result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)}
          />
        </div>

        {/* Learning insight */}
        <Card className="p-7 mb-6 animate-fade-in-up delay-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb size={18} strokeWidth={2} className="text-neutral-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900 uppercase mb-2">Learning Insight</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{result.insight}</p>
            </div>
          </div>
        </Card>

        {/* Mistakes */}
        {result.mistakes.length > 0 && (
          <Card className="p-7 mb-6 animate-fade-in-up delay-400">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle size={16} strokeWidth={2} className="text-warning-600" />
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900 uppercase">
                Mistakes & Patterns ({result.mistakes.length})
              </h3>
            </div>
            <div className="space-y-4">
              {result.mistakes.map((mistake, i) => (
                <div key={i} className="pl-4 border-l-2 border-neutral-200">
                  <p className="text-sm font-medium text-neutral-900 mb-1">{mistake.question}</p>
                  <div className="flex flex-col gap-1 mt-2">
                    <p className="text-xs text-error-600">
                      <span className="text-neutral-400">Your answer: </span>
                      {mistake.userAnswer}
                    </p>
                    <p className="text-xs text-success-600">
                      <span className="text-neutral-400">Correct: </span>
                      {mistake.correctAnswer}
                    </p>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2 italic">{mistake.pattern}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Next recommendation */}
        <Card className="p-7 mb-8 animate-fade-in-up delay-500">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isNeuralActive ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
              {isNeuralLoading ? (
                <Loader2 size={18} strokeWidth={2} className="text-neutral-400 animate-spin" />
              ) : isNeuralActive ? (
                <Sparkles size={18} strokeWidth={2} className="text-white" />
              ) : (
                <ArrowRight size={18} strokeWidth={2} className="text-neutral-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold tracking-tight text-neutral-900 uppercase">
                  {isNeuralLoading ? 'Neural Pulse analyzing...' : isNeuralActive ? 'Neural Pulse Next Step' : 'Next Recommendation'}
                </h3>
                {isNeuralActive && (
                  <span className="text-xs text-neutral-400">Powered by Evorozen Neural Pulse</span>
                )}
              </div>
              {isNeuralLoading ? (
                <div className="space-y-2">
                  <div className="h-3 bg-neutral-200 rounded animate-pulse" style={{ width: '90%' }} />
                  <div className="h-3 bg-neutral-200 rounded animate-pulse" style={{ width: '65%' }} />
                </div>
              ) : (
                <p className="text-sm text-neutral-600 leading-relaxed">{nextRecommendation}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Adaptive loop visual — shows how RecallOS processed this session */}
        {!isNeuralLoading && (
          <Card className="p-7 mb-8 animate-fade-in-up delay-500">
            <h3 className="text-sm font-semibold tracking-tight text-neutral-900 uppercase mb-5">How RecallOS Adapted</h3>
            <div className="flex flex-col gap-3">
              <LoopStep
                step="1"
                label="New Evidence"
                value={`${result.accuracy}% accuracy on ${result.topic}`}
              />
              <LoopConnector />
              <LoopStep
                step="2"
                label="Learner State Updated"
                value={`${result.topic} mastery ${result.mistakes.length > 0 ? `+${result.accuracy >= 80 ? 15 : result.accuracy >= 60 ? 8 : 3}%` : 'reinforced'}`}
              />
              <LoopConnector />
              <LoopStep
                step="3"
                label="Neural Pulse Reasoning"
                value={isNeuralActive ? 'AI analyzed your full session history' : isNeuralError ? 'Offline fallback engaged' : 'Analyzing performance patterns'}
                highlight={isNeuralActive}
              />
              <LoopConnector />
              <LoopStep
                step="4"
                label="Next Study Decision"
                value={isNeuralActive && state.adaptivePlan ? state.adaptivePlan.priorityTopic : result.topic}
                highlight={isNeuralActive}
              />
            </div>
          </Card>
        )}

        {/* Confidence selector + Save */}
        {!saved ? (
          <Card className="p-7 animate-fade-in-up delay-500">
            <p className="text-sm font-semibold tracking-tight text-neutral-900 mb-1">How confident do you feel about this topic?</p>
            <p className="text-xs text-neutral-400 mb-4">Your self-assessment helps RecallOS calibrate your plan.</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {(['low', 'medium', 'high'] as ConfidenceLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setConfidence(level)}
                  className={`py-3 rounded-xl text-sm font-medium tracking-tight border transition-all duration-200 ${
                    confidence === level
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <Button size="lg" fullWidth onClick={handleSave}>
              <Save size={18} strokeWidth={2} className="mr-2" />
              Save Progress
            </Button>
          </Card>
        ) : (
          <div className="text-center animate-scale-in">
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-success-50 text-success-700 mb-6">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm font-semibold tracking-tight">Progress saved — your plan has been updated</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" variant="secondary" onClick={onGoToDashboard}>
                View Dashboard
                <ArrowRight size={18} strokeWidth={2} className="ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  valueClass = 'text-neutral-900',
}: {
  icon: typeof Target;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card className="p-5 text-center" hover>
      <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center mx-auto mb-3">
        <Icon size={16} strokeWidth={2} className="text-neutral-600" />
      </div>
      <p className={`text-lg font-semibold tracking-tight ${valueClass}`}>{value}</p>
      <p className="text-xs text-neutral-400 mt-1">{label}</p>
    </Card>
  );
}

function LoopStep({
  step,
  label,
  value,
  highlight = false,
}: {
  step: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold transition-colors duration-200 ${
        highlight ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'
      }`}>
        {step}
      </div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-tight text-neutral-700 uppercase">{label}</span>
        <span className="text-sm text-neutral-600 text-right">{value}</span>
      </div>
    </div>
  );
}

function LoopConnector() {
  return (
    <div className="ml-4 h-4 w-px bg-neutral-200" />
  );
}
