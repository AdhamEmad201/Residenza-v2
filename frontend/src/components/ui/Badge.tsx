import React from 'react';

export type BadgeVariant =
  | 'verified'
  | 'gold'
  | 'navy'
  | 'neutral'
  | 'warning'
  | 'outline';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const badgeStyles: Record<BadgeVariant, string> = {
  verified:
    'bg-[#E8F6EF]/95 text-[#136F48] backdrop-blur-md shadow-xs',
  gold:
    'bg-[#F3EAD8]/95 text-[#8A6346] backdrop-blur-md shadow-xs',
  navy:
    'bg-[#403E3D]/92 text-[#FAF7F2] backdrop-blur-md shadow-xs',
  neutral:
    'bg-[#F3EAD8] text-[#403E3D]',
  warning:
    'bg-amber-50/95 text-amber-900',
  outline:
    'bg-white/90 text-[#403E3D] backdrop-blur-md shadow-xs',
};

const dotColors: Record<BadgeVariant, string> = {
  verified: 'bg-[#16A34A]',
  gold: 'bg-[#9F7753]',
  navy: 'bg-[#CEB38F]',
  neutral: 'bg-[#7D7772]',
  warning: 'bg-amber-600',
  outline: 'bg-[#403E3D]',
};

export function Badge({
  children,
  variant = 'neutral',
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${badgeStyles[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
