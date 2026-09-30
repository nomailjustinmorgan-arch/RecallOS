import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BookOpen, Target, Calendar, Clock, AlertCircle, Plus, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { StudyPlan } from '@/types';

interface SetupPageProps {
  onComplete: () => void;
}

const SUBJECT_SUGGESTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'History', 'Literature', 'Economics', 'Psychology',
];

const GOAL_SUGGESTIONS = [
  'Final exam preparation',
  'Master fundamentals',
  'Competitive entrance exam',
  'Skill certification',
  'General knowledge building',
];

export function SetupPage({ onComplete }: SetupPageProps) {
  const { createPlan } = useApp();
  const [subject, setSubject] = useState('');
  const [goal, setGoal] = useState('');
  const [daysRemaining, setDaysRemaining] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState('');
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [weakTopicInput, setWeakTopicInput] = useState('');

  const canSubmit =
    subject.trim().length > 0 &&
    goal.trim().length > 0 &&
    Number(daysRemaining) > 0 &&
    Number(dailyMinutes) > 0;

  function handleAddWeakTopic() {
    const trimmed = weakTopicInput.trim();
    if (trimmed && !weakTopics.includes(trimmed)) {
      setWeakTopics([...weakTopics, trimmed]);
      setWeakTopicInput('');
    }
  }

  function handleRemoveWeakTopic(topic: string) {
    setWeakTopics(weakTopics.filter((t) => t !== topic));
  }

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const plan: StudyPlan = {
      subject: subject.trim(),
      goal: goal.trim(),
      daysRemaining: Number(daysRemaining),
      dailyMinutes: Number(dailyMinutes),
      weakTopics,
      createdAt: Date.now(),
    };
    await createPlan(plan);
    onComplete();
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            Build your study plan
          </h1>
          <p className="mt-3 text-base text-neutral-500 leading-relaxed">
            Tell RecallOS what you are working toward. Your plan will adapt after every session.
          </p>
        </div>

        <Card className="mt-10 p-8 animate-fade-in-up delay-200">
          <div className="space-y-7">
            {/* Subject */}
            <Field
              icon={BookOpen}
              label="Subject"
              hint="What are you studying?"
            >
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                className="input-field"
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SUBJECT_SUGGESTIONS.slice(0, 5).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors duration-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            {/* Goal */}
            <Field
              icon={Target}
              label="Goal"
              hint="What is the outcome you want?"
            >
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Final exam preparation"
                className="input-field"
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {GOAL_SUGGESTIONS.slice(0, 3).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors duration-200"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </Field>

            {/* Days & Minutes */}
            <div className="grid grid-cols-2 gap-5">
              <Field
                icon={Calendar}
                label="Days remaining"
                hint="Until your target date"
              >
                <input
                  type="number"
                  value={daysRemaining}
                  onChange={(e) => setDaysRemaining(e.target.value)}
                  placeholder="30"
                  min={1}
                  className="input-field"
                />
              </Field>

              <Field
                icon={Clock}
                label="Daily study minutes"
                hint="Time you can commit per day"
              >
                <input
                  type="number"
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(e.target.value)}
                  placeholder="45"
                  min={5}
                  step={5}
                  className="input-field"
                />
              </Field>
            </div>

            {/* Weak Topics */}
            <Field
              icon={AlertCircle}
              label="Weak topics"
              hint="Optional — areas you struggle with"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={weakTopicInput}
                  onChange={(e) => setWeakTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddWeakTopic();
                    }
                  }}
                  placeholder="Add a weak topic and press Enter"
                  className="input-field flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddWeakTopic}
                  disabled={!weakTopicInput.trim()}
                  className="px-3"
                >
                  <Plus size={16} strokeWidth={2} />
                </Button>
              </div>
              {weakTopics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {weakTopics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-warning-50 text-warning-600 border border-warning-100"
                    >
                      {topic}
                      <button onClick={() => handleRemoveWeakTopic(topic)} className="hover:text-warning-700 transition-colors">
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-100">
            <Button size="lg" fullWidth onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting ? 'Creating...' : 'Create My Plan'}
            </Button>
            {!canSubmit && (
              <p className="mt-3 text-xs text-neutral-400 text-center">
                Fill in subject, goal, days, and daily minutes to continue
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: typeof BookOpen;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} strokeWidth={2} className="text-neutral-400" />
        <label className="text-sm font-semibold tracking-tight text-neutral-900">{label}</label>
      </div>
      <p className="text-xs text-neutral-400 mb-3">{hint}</p>
      {children}
    </div>
  );
}
