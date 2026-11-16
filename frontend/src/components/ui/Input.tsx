import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, suffix, className = '', id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="w-full space-y-1.5 text-start">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-[#131E26]"
        >
          {label}
          {props.required && <span className="ms-1 text-[#C59B4E]">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full rounded-2xl bg-[#FAF7F2] px-4 py-3 text-sm text-[#131E26] ring-1 ring-[#131E26]/10 placeholder:text-[#78828A] transition-all duration-200 hover:ring-[#131E26]/25 focus:bg-white focus:ring-2 focus:ring-[#C59B4E] focus:outline-none ${
            suffix ? 'pe-14' : ''
          } ${
            error
              ? 'ring-red-600 focus:ring-red-600'
              : ''
          } disabled:cursor-not-allowed disabled:bg-[#F3EDE2] ${className}`}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-4 text-xs font-semibold text-[#78828A]">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-[11px] text-[#78828A]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
});
