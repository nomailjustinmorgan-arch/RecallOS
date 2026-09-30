import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { useApp } from '@/context/AppContext';
import type { View } from '@/types';
import { LayoutDashboard, Target, Calendar, Home, RotateCcw } from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
  showNav?: boolean;
}

export function AppShell({ children, currentView, onNavigate, showNav = true }: AppShellProps) {
  const { state, reset } = useApp();
  const hasPlan = state.plan !== null;

  const navItems: { view: View; label: string; icon: typeof Target }[] = [
    { view: 'mission', label: "Today", icon: Calendar },
    { view: 'dashboard', label: 'Progress', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => onNavigate(hasPlan ? 'mission' : 'landing')} className="transition-transform duration-200 hover:scale-[1.02]">
            <Logo size="sm" />
          </button>

          {showNav && hasPlan && (
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => onNavigate(item.view)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium tracking-tight transition-all duration-200 ${
                      active
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    <Icon size={16} strokeWidth={2} />
                    {item.label}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  reset();
                  onNavigate('landing');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium tracking-tight text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-all duration-200 ml-1"
                title="Reset plan"
              >
                <RotateCcw size={16} strokeWidth={2} />
              </button>
            </nav>
          )}

          {!hasPlan && (
            <button
              onClick={() => onNavigate('setup')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium tracking-tight text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-all duration-200"
            >
              <Home size={16} strokeWidth={2} />
              Get Started
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-neutral-200/60 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Logo size="sm" showWordmark={false} />
              <p className="text-xs text-neutral-400 tracking-tight">RecallOS — Adaptive Study Intelligence</p>
            </div>
            <p className="text-xs text-neutral-300 tracking-tight flex items-center gap-1.5">
              Powered by
              <span className="font-medium text-neutral-500">Evorozen Neural Pulse</span>
            </p>
          </div>
          <p className="text-xs text-neutral-300 tracking-tight max-w-2xl mx-auto sm:mx-0 text-center sm:text-left leading-relaxed">
            Neural Pulse provides RecallOS with persistent learner state, structured data operations, and the adaptive AI reasoning layer used to update study recommendations.
          </p>
        </div>
      </footer>
    </div>
  );
}
