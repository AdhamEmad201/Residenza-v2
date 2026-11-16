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
    'bg-[#F7EFE0]/95 text-[#8E6722] backdrop-blur-md shadow-xs',
  navy:
    'bg-[#131E26]/90 text-[#FAF7F2] backdrop-blur-md shadow-xs',
  neutral:
    'bg-[#F3EDE2] text-[#4A555E]',
  warning:
    'bg-amber-50/95 text-amber-900',
  outline:
    'bg-white/90 text-[#131E26] backdrop-blur-md shadow-xs',
};

const dotColors: Record<BadgeVariant, string> = {
  verified: 'bg-[#16A34A]',
  gold: 'bg-[#C59B4E]',
  navy: 'bg-[#C59B4E]',
  neutral: 'bg-[#78828A]',
  warning: 'bg-amber-600',
  outline: 'bg-[#131E26]',
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
