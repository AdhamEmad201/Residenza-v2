import React, { useId } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
  placeholderOption?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    hint,
    error,
    options,
    placeholderOption,
    className = '',
    id,
    children,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div className="w-full space-y-1.5 text-start">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold text-[#131E26]"
        >
          {label}
          {props.required && <span className="ms-1 text-[#C59B4E]">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full appearance-none rounded-2xl bg-[#FAF7F2] ps-4 pe-10 py-3 text-sm text-[#131E26] ring-1 ring-[#131E26]/10 transition-all duration-200 hover:ring-[#131E26]/25 focus:bg-white focus:ring-2 focus:ring-[#C59B4E] focus:outline-none ${
            error
              ? 'ring-red-600 focus:ring-red-600'
              : ''
          } disabled:cursor-not-allowed disabled:bg-[#F3EDE2] ${className}`}
          {...props}
        >
          {placeholderOption !== undefined && (
            <option value="">{placeholderOption}</option>
          )}
          {options
            ? options.map((opt) => (
                <option key={String(opt.value)} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span
          className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3.5 text-[#78828A]"
          aria-hidden="true"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
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
