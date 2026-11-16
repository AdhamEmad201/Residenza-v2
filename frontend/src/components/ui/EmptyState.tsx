import React from 'react';
import Link from 'next/link';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
}: EmptyStateProps) {
  return (
    <div className="rounded-3xl bg-white py-16 px-8 text-center shadow-ambient">
      <span className="inline-flex items-center gap-2 rounded-full bg-[#F7EFE0] px-4 py-1.5 text-xs font-bold text-[#A67C33]">
        سجل ريزيدنزا العقاري المعتمد
      </span>
      <h3 className="mt-5 text-2xl font-bold text-[#131E26]">{title}</h3>
      <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-[#4A555E]">
        {description}
      </p>
      {actionLabel && actionHref && (
        <div className="mt-8">
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center rounded-full bg-[#131E26] px-7 py-3.5 text-xs font-bold tracking-wide text-white shadow-md transition-all hover:bg-[#1E2E3A] active:scale-[0.98]"
          >
            {actionLabel}
          </Link>
        </div>
      )}
      {actionLabel && !actionHref && onActionClick && (
        <div className="mt-8">
          <button
            type="button"
            onClick={onActionClick}
            className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#131E26] px-7 py-3.5 text-xs font-bold tracking-wide text-white shadow-md transition-all hover:bg-[#1E2E3A] active:scale-[0.98]"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
