'use client';

import { useEffect, useState } from 'react';

import { CheckCircle2, Circle, Loader2, SkipForward } from 'lucide-react';

import {
  getPurchaseProcess,
  markStepComplete,
} from '@/prisma/services/purchase';

import { PurchaseProcessData, PurchaseProcessStep } from '@/lib/types';
import { handleError } from '@/lib/utils';

import { Skeleton } from '@/components/ui/skeleton';

import { Button } from './ui/button';

type StepStatus = 'completed' | 'bypassed' | 'pending';

function getStepStatus(
  step: PurchaseProcessStep,
  steps: PurchaseProcessStep[],
): StepStatus {
  if (step.completion) return 'completed';
  const hasLaterCompletion = steps.some(
    (s) => s.order > step.order && s.completion !== null,
  );
  return hasLaterCompletion ? 'bypassed' : 'pending';
}

function StepStatusBadge({ status }: { status: StepStatus }) {
  if (status === 'completed')
    return (
      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle2 className="size-3" />
        Completed
      </span>
    );
  if (status === 'bypassed')
    return (
      <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        <SkipForward className="size-3" />
        Bypassed
      </span>
    );
  return (
    <span className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
      <Circle className="size-3" />
      Pending
    </span>
  );
}

export function ProcessProgress({ purchaseId }: { purchaseId: string }) {
  const [data, setData] = useState<PurchaseProcessData | null | undefined>(
    undefined,
  );
  const [markingStepId, setMarkingStepId] = useState<string | null>(null);

  useEffect(() => {
    getPurchaseProcess(purchaseId).then(setData);
  }, [purchaseId]);

  async function handleMarkComplete(stepId: string) {
    if (!data) return;
    setMarkingStepId(stepId);
    const result = await handleError(markStepComplete(data.processId, stepId), {
      toast: {
        loading: 'Marking step complete...',
        success: 'Step marked as complete',
        error: 'Failed to mark step complete',
      },
      onSuccess: (res) => {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            steps: prev.steps.map((s: PurchaseProcessStep) =>
              s.id === stepId
                ? {
                    ...s,
                    completion: {
                      id: res.id,
                      markedAt: new Date(),
                      completionDate: null,
                    },
                  }
                : s,
            ),
          };
        });
      },
    });
    void result;
    setMarkingStepId(null);
  }

  if (data === undefined)
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );

  if (data === null) return null;

  return (
    <div className="bg-muted rounded-lg px-4 py-3">
      <p className="text-muted-foreground mb-3 text-sm font-medium">
        Process:{' '}
        <span className="text-foreground font-semibold">
          {data.templateName}
        </span>
      </p>
      <div className="flex flex-col gap-2">
        {data.steps.map((step: PurchaseProcessStep, idx: number) => {
          const status = getStepStatus(step, data.steps);
          return (
            <div
              key={step.id}
              className="bg-background flex items-start justify-between gap-3 rounded-md px-3 py-2.5"
            >
              <div className="flex items-start gap-2.5">
                <span className="bg-muted text-muted-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{step.name}</p>
                  {status === 'completed' && step.completion && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Marked:{' '}
                      {new Date(step.completion.markedAt).toLocaleString()}
                      {step.completion.completionDate && (
                        <>
                          {' · '}Completed:{' '}
                          {new Date(
                            step.completion.completionDate,
                          ).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StepStatusBadge status={status} />
                {status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    disabled={markingStepId !== null}
                    onClick={() => handleMarkComplete(step.id)}
                  >
                    {markingStepId === step.id && (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    )}
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
