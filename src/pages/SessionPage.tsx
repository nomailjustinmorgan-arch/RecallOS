import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ChevronLeft, ChevronRight, Check, Brain } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { ConfidenceLevel } from '@/types';

interface SessionPageProps {
  onComplete: (confidence: ConfidenceLevel) => void;
}

export function SessionPage({ onComplete }: SessionPageProps) {
  const { state, answerQuestion } = useApp();
  const session = state.currentSession;
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <p className="text-neutral-500">No active session.</p>
      </div>
    );
  }

  const question = session.questions[currentIndex];
  const total = session.questions.length;
  const progress = ((currentIndex + 1) / total) * 100;
  const answeredCount = session.answers.filter((a) => a !== -1).length;
  const allAnswered = session.answers.every((a) => a !== -1);

  function handleNext() {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  }

  function handleComplete() {
    if (!allAnswered) return;
    onComplete('medium');
  }

  const selectedAnswer = session.answers[currentIndex];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Session header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center">
                <Brain size={16} strokeWidth={2} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-neutral-900">{session.topic}</p>
                <p className="text-xs text-neutral-400">Question {currentIndex + 1} of {total}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-neutral-400 tabular-nums">
              {answeredCount}/{total} answered
            </span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div key={question.id} className="animate-slide-in-right">
            <p className="text-xs font-semibold tracking-tight text-neutral-400 uppercase mb-3">
              Active Recall · {session.topic}
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 leading-snug mb-8">
              {question.prompt}
            </h2>

            <div className="space-y-3">
              {question.options.map((option, i) => {
                const isSelected = selectedAnswer === i;
                return (
                  <button
                    key={i}
                    onClick={() => answerQuestion(currentIndex, i)}
                    className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ease-smooth flex items-center gap-4 ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-soft'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                      isSelected ? 'border-white bg-white' : 'border-neutral-300'
                    }`}>
                      {isSelected && <Check size={14} strokeWidth={3} className="text-neutral-900" />}
                    </div>
                    <span className="text-sm font-medium tracking-tight">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t border-neutral-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={16} strokeWidth={2} className="mr-1" />
            Previous
          </Button>

          {currentIndex === total - 1 ? (
            <Button size="sm" onClick={handleComplete} disabled={!allAnswered}>
              <Check size={16} strokeWidth={2} className="mr-1" />
              Finish Session
            </Button>
          ) : (
            <Button size="sm" onClick={handleNext} disabled={selectedAnswer === -1}>
              Next
              <ChevronRight size={16} strokeWidth={2} className="ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
