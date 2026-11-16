import React from 'react';

export type ButtonVariant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#131E26] text-[#FAF7F2] shadow-md hover:bg-[#1E2E3A] hover:shadow-lg focus-visible:outline-[#131E26]',
  gold:
    'bg-[#C59B4E] text-white shadow-md hover:bg-[#A67C33] hover:shadow-lg focus-visible:outline-[#C59B4E]',
  outline:
    'bg-white/80 backdrop-blur-md text-[#131E26] ring-1 ring-[#131E26]/15 hover:bg-[#131E26] hover:text-[#FAF7F2] focus-visible:outline-[#C59B4E]',
  ghost:
    'bg-transparent text-[#4A555E] hover:bg-[#F3EDE2]/80 hover:text-[#131E26] focus-visible:outline-[#C59B4E]',
  danger:
    'bg-red-700 text-white shadow-sm hover:bg-red-800 focus-visible:outline-red-700',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs rounded-full gap-1.5',
  md: 'px-6 py-3 text-xs tracking-wide rounded-full gap-2',
  lg: 'px-8 py-4 text-sm tracking-wide rounded-full gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-bold transition-all duration-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading && (
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
