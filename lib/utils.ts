import { type ClassValue, clsx } from 'clsx';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  value = Math.round(value * 100) / 100;
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getFileUrl(key: string) {
  return `https://${process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID}.ufs.sh/f/${key}`;
}

/**
 * Parses a date-only value from the database into a Date object in local timezone.
 * This prevents off-by-one errors when date-only fields are interpreted as UTC midnight.
 * @param dateValue The date value from the database (Date or string)
 * @returns A Date object with the correct date in local timezone
 */
export function parseDateOnly(dateValue: Date | string): Date {
  if (dateValue instanceof Date) {
    // If it's already a Date object, extract the year, month, and day
    // and create a new Date in local timezone
    const year = dateValue.getUTCFullYear();
    const month = dateValue.getUTCMonth();
    const day = dateValue.getUTCDate();
    return new Date(year, month, day);
  }

  // If it's a string (e.g., "2024-01-15"), parse it as local date
  const dateStr = String(dateValue);
  const parts = dateStr.split('-');

  // Validate the format and parse
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: expected YYYY-MM-DD, got ${dateStr}`);
  }

  const [yearStr, monthStr, dayStr] = parts;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Validate parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date values in: ${dateStr}`);
  }

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month value: ${month}`);
  }

  if (day < 1 || day > 31) {
    throw new Error(`Invalid day value: ${day}`);
  }

  // Create Date in local timezone (month is 0-indexed in JS)
  const result = new Date(year, month - 1, day);

  // Validate the resulting date
  if (isNaN(result.getTime())) {
    throw new Error(`Failed to create valid date from: ${dateStr}`);
  }

  return result;
}

// Type definitions for toast handling
export type ErrorType = { error: string };

export type ResponseType<T> = T | ErrorType;

export function isError<T>(result: ResponseType<T>): result is ErrorType {
  return (result as ErrorType).error !== undefined;
}

/**
 * Handles toast notifications for async operations with Result types
 * Manually manages toast lifecycle to intercept errors before success state
 * @param promise The promise to execute
 * @param options Configuration object containing toast messages and callbacks
 * @returns The result of the promise
 */
export async function handleError<T>(
  promise: Promise<ResponseType<T>>,
  options: {
    toast: { loading: string; success: string; error?: string };
    onSuccess?: (data: T) => void;
    onError?: (error: ErrorType) => void;
    onFinish?: () => void;
  },
): Promise<ResponseType<T>> {
  const toastId = toast.loading(options.toast.loading);

  try {
    const result = await promise;

    if (isError(result)) {
      // Show error toast for ErrorType - prefer server error message when available
      const errorMessage =
        result.error || options.toast.error || 'An error occurred';
      toast.error(errorMessage, { id: toastId });
      if (options.onError) options.onError(result);
      return result;
    }

    // Show success toast
    toast.success(options.toast.success, { id: toastId });

    if (options.onSuccess) options.onSuccess(result);

    return result;
  } catch (error) {
    // Handle unexpected errors
    toast.error(options.toast.error || 'An error occurred', { id: toastId });
    throw error;
  } finally {
    if (options.onFinish) options.onFinish();
  }
}
