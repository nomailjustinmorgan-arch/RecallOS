import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={`bg-white border border-neutral-200 rounded-2xl shadow-soft ${hover ? 'transition-all duration-300 ease-smooth hover:shadow-card hover:border-neutral-300' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
