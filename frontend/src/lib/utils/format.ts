/**
 * RESIDENZA — Data formatting helpers
 * Adheres to Decision D-02: Western Arabic digits (0-9) for numerical clarity.
 */

export function formatPriceEgp(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return '0 ج.م';
  }
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(num);

  return `${formatted} ج.م`;
}

export function formatAreaSqm(area: number | string): string {
  const num = typeof area === 'string' ? parseFloat(area) : area;
  if (isNaN(num)) {
    return '0 م²';
  }
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(num);

  return `${formatted} م²`;
}

export function formatDateAr(isoDate?: string | null): string {
  if (!isoDate) {
    return '';
  }
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

