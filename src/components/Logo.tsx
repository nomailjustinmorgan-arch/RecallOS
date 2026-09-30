import { Brain } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

const sizeMap = {
  sm: { icon: 18, text: 'text-base' },
  md: { icon: 24, text: 'text-xl' },
  lg: { icon: 32, text: 'text-2xl' },
};

export function Logo({ size = 'md', showWordmark = true }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative flex items-center justify-center rounded-xl bg-neutral-900 text-white shadow-soft" style={{ width: s.icon + 12, height: s.icon + 12 }}>
        <Brain size={s.icon} strokeWidth={2} />
      </div>
      {showWordmark && (
        <span className={`font-semibold tracking-tight text-neutral-900 ${s.text}`}>
          Recall<span className="text-neutral-400">OS</span>
        </span>
      )}
    </div>
  );
}
