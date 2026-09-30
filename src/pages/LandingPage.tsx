import { Button } from '@/components/ui/Button';
import { Brain, Target, TrendingUp, RefreshCw, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const features = [
  {
    icon: Brain,
    title: 'Remembers how you learn',
    description: 'RecallOS tracks your accuracy, confidence, mistakes, and study patterns to build a living model of your knowledge.',
  },
  {
    icon: Target,
    title: 'Adapts to your goals',
    description: 'Every session reshapes your plan. Weak topics get priority, strong topics get spaced review, and new topics appear when you are ready.',
  },
  {
    icon: TrendingUp,
    title: 'Measures real mastery',
    description: 'Move beyond completion percentages. See estimated mastery per topic, confidence trends, and patterns in your mistakes.',
  },
  {
    icon: RefreshCw,
    title: 'Never stops adjusting',
    description: 'Your study plan is not a static schedule. It recomputes after every session based on what you actually did and how you performed.',
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 to-white" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
            <span className="text-xs font-medium tracking-tight text-neutral-600">Adaptive AI Study System</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-neutral-900 leading-[1.05] animate-fade-in-up">
            Your study plan<br />
            should <span className="italic font-light text-neutral-500">remember</span> you.
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            RecallOS is an adaptive learning system that remembers how you study and continuously
            reshapes your plan based on your goals, performance, confidence, and mistakes — so every
            session is exactly what you need next.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
            <Button size="lg" onClick={onGetStarted} className="group">
              Build My Study Plan
              <ArrowRight size={18} strokeWidth={2} className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="secondary" onClick={onGetStarted}>
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group p-8 bg-white border border-neutral-200 rounded-2xl shadow-soft hover:shadow-card transition-all duration-500 ease-smooth animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center mb-5 group-hover:bg-neutral-900 transition-colors duration-300">
                  <Icon size={20} strokeWidth={2} className="text-neutral-700 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-neutral-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 leading-tight">
          Stop studying the same way every day.
        </h2>
        <p className="mt-4 text-lg text-neutral-500 max-w-xl mx-auto">
          Build a plan that adapts. Your next session is already waiting.
        </p>
        <div className="mt-10">
          <Button size="lg" onClick={onGetStarted} className="group">
            Build My Study Plan
            <ArrowRight size={18} strokeWidth={2} className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>
      </section>
    </div>
  );
}
