interface ProgressBarProps {
  value: number;
  className?: string;
  color?: 'neutral' | 'success' | 'warning' | 'error';
}

const colorMap = {
  neutral: 'bg-neutral-900',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
};

export function ProgressBar({ value, className = '', color = 'neutral' }: ProgressBarProps) {
  return (
    <div className={`h-1.5 bg-neutral-100 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full ${colorMap[color]} rounded-full transition-all duration-700 ease-smooth`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
