'use client';

import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  Circle,
  Loader2,
  SkipForward,
  Undo2,
} from 'lucide-react';
import { z } from 'zod/v4';

import {
  getPurchaseProcess,
  markStepComplete,
  unmarkStepComplete,
} from '@/prisma/services/purchase';

import { PurchaseProcessData, PurchaseProcessStep } from '@/lib/types';
import { handleError } from '@/lib/utils';

import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';

import { Button } from './ui/button';

const markCompleteSchema = z.object({
  completionDate: z.date(),
  notes: z.string(),
});

type MarkCompleteFormValues = z.infer<typeof markCompleteSchema>;

function todayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function MarkCompleteForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (values: MarkCompleteFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const form = useForm<MarkCompleteFormValues>({
    resolver: zodResolver(markCompleteSchema),
    defaultValues: { completionDate: todayDate(), notes: '' },
  });

  return (
    <form
      className="flex items-center gap-2 border-t px-3 py-2"
      onSubmit={form.handleSubmit(onConfirm)}
    >
      <div className="shrink-0">
        <Controller
          control={form.control}
          name="completionDate"
          render={({ field }) => (
            <DatePicker value={field.value} onChange={field.onChange} />
          )}
        />
      </div>
      <Input
        {...form.register('notes')}
        placeholder="Notes (optional)"
        className="h-9 text-sm"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onCancel}
        disabled={form.formState.isSubmitting}
        className="shrink-0"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        size="sm"
        disabled={form.formState.isSubmitting}
        className="shrink-0"
      >
        {form.formState.isSubmitting && (
          <Loader2 className="mr-1 size-3 animate-spin" />
        )}
        Confirm
      </Button>
    </form>
  );
}

type StepStatus = 'completed' | 'bypassed' | 'pending';

export function getStepStatus(
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
      <span className="bg-process-step-completed/10 text-process-step-completed flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
        <CheckCircle2 className="size-3" />
        Completed
      </span>
    );
  if (status === 'bypassed')
    return (
      <span className="bg-process-step-bypassed/10 text-process-step-bypassed flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
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

export function ProcessProgress({
  purchaseId,
  onDataChange,
}: {
  purchaseId: string;
  onDataChange?: (data: PurchaseProcessData | null) => void;
}) {
  const [data, setData] = useState<PurchaseProcessData | null | undefined>(
    undefined,
  );
  const [mutatingStepId, setMutatingStepId] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const updateData = useCallback(
    (next: PurchaseProcessData | null) => {
      setData(next);
      if (onDataChange) onDataChange(next);
    },
    [onDataChange],
  );

  useEffect(() => {
    getPurchaseProcess(purchaseId).then(updateData);
  }, [purchaseId, updateData]);

  async function handleConfirm(
    values: MarkCompleteFormValues,
    step: PurchaseProcessStep,
  ) {
    if (!data) return;
    setMutatingStepId(step.id);
    const markedAt = new Date();
    const result = await handleError(
      markStepComplete(data.processId, step.id, {
        completionDate: values.completionDate,
        notes: values.notes || null,
      }),
      {
        toast: {
          loading: 'Marking step complete...',
          success: 'Step marked as complete',
          error: 'Failed to mark step complete',
        },
        onSuccess: (res) => {
          updateData({
            ...data,
            steps: data.steps.map((s: PurchaseProcessStep) =>
              s.id === step.id
                ? {
                    ...s,
                    completion: {
                      id: res.id,
                      markedAt,
                      completionDate: values.completionDate,
                      notes: values.notes || null,
                    },
                  }
                : s,
            ),
          });
          setExpandedStepId(null);
        },
      },
    );
    void result;
    setMutatingStepId(null);
  }

  async function handleUnmark(stepId: string, completionId: string) {
    if (!data) return;
    setMutatingStepId(stepId);
    const result = await handleError(unmarkStepComplete(completionId), {
      toast: {
        loading: 'Undoing completion...',
        success: 'Completion undone',
        error: 'Failed to undo completion',
      },
      onSuccess: () => {
        updateData({
          ...data,
          steps: data.steps.map((s: PurchaseProcessStep) =>
            s.id === stepId ? { ...s, completion: null } : s,
          ),
        });
      },
    });
    void result;
    setMutatingStepId(null);
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
    <>
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
                className="bg-background rounded-md"
              >
                <div className="flex items-start justify-between gap-3 px-3 py-2.5">
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
                          {step.completion.notes && (
                            <> · {step.completion.notes}</>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StepStatusBadge status={status} />
                    {status === 'completed' && step.completion && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground h-6 px-2 text-xs"
                        disabled={mutatingStepId !== null}
                        onClick={() => handleUnmark(step.id, step.completion!.id)}
                      >
                        {mutatingStepId === step.id ? (
                          <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                          <Undo2 className="mr-1 size-3" />
                        )}
                        Undo
                      </Button>
                    )}
                    {(status === 'pending' || status === 'bypassed') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        disabled={mutatingStepId !== null}
                        onClick={() => {
                          if (expandedStepId === step.id) {
                            setExpandedStepId(null);
                          } else {
                            setExpandedStepId(step.id);
                          }
                        }}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
                {expandedStepId === step.id && (
                  <div className="animate-in slide-in-from-top-1 fade-in-0 duration-200">
                    <MarkCompleteForm
                      onConfirm={(values) => handleConfirm(values, step)}
                      onCancel={() => setExpandedStepId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
