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
    'bg-[#403E3D] text-[#FAF7F2] shadow-md hover:bg-[#2F2D2C] hover:shadow-lg focus-visible:outline-[#403E3D]',
  gold:
    'bg-[#9F7753] text-white shadow-md hover:bg-[#8A6346] hover:shadow-lg focus-visible:outline-[#9F7753]',
  outline:
    'bg-white/80 backdrop-blur-md text-[#403E3D] ring-1 ring-[#403E3D]/15 hover:bg-[#403E3D] hover:text-[#FAF7F2] focus-visible:outline-[#9F7753]',
  ghost:
    'bg-transparent text-[#5C5855] hover:bg-[#F3EAD8]/80 hover:text-[#403E3D] focus-visible:outline-[#9F7753]',
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
