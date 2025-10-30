'use client';

import { toast } from 'sonner';

import { Result, isError } from './error-handler';

/**
 * Wraps a promise with toast notifications
 * @param promise The promise to execute
 * @param messages The messages to display for loading, success, and error states
 * @param onSuccess Optional callback to execute on success
 * @returns The result of the promise
 */
export async function handleToast<T>(
  promise: Promise<Result<T>>,
  messages: { loading: string; success: string; error?: string },
  onSuccess?: (data: T) => void,
): Promise<Result<T>> {
  const result = await toast.promise(promise, {
    loading: messages.loading,
    success: (data) => {
      if (isError(data)) {
        throw new Error(data.error);
      }
      if (onSuccess) {
        onSuccess(data);
      }
      return messages.success;
    },
    error: (err) => {
      if (err instanceof Error && err.message) {
        return err.message;
      }
      return messages.error || 'An error occurred';
    },
  });

  return result;
}
