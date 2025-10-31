import { type ClassValue, clsx } from 'clsx';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  value = Math.round(value * 100) / 100;
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function getFileUrl(key: string) {
  return `https://${process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID}.ufs.sh/f/${key}`;
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
      // Show error toast for ErrorType
      toast.error(options.toast.error || 'An error occurred', { id: toastId });
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
