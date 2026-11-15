'use client';

import { useEffect } from 'react';

import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

export default function DivisionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error('Failed to load division budgets', {
      description: error.message,
    });
  }, [error]);

  return (
    <EmptyState
      message="Failed to load division budgets"
      description="Something went wrong while loading the figures."
      action={
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
