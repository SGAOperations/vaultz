'use client';

import { useState } from 'react';

import {
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  MoreVertical,
  Slash,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  deletePurchaseStep,
  togglePurchaseStepComplete,
  togglePurchaseStepSkipped,
  updatePurchaseStep,
} from '@/prisma/services/purchase-step';

import { PurchaseStep } from '@/lib/types';
import { handleError } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export function PurchaseSteps({
  steps,
  editable = true,
  onStepsChange,
}: {
  steps: PurchaseStep[];
  editable?: boolean;
  onStepsChange?: () => void;
}) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (steps.length === 0) {
    return null;
  }

  const completedSteps = steps.filter((s) => s.completedAt).length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  async function handleToggleComplete(step: PurchaseStep) {
    if (!editable) return;

    // If step is completed, show confirmation before unmarking
    if (step.completedAt) {
      const confirmed = window.confirm(
        'Are you sure you want to unmark this step as completed?',
      );
      if (!confirmed) return;
    }

    await handleError(togglePurchaseStepComplete(step.id), {
      toast: {
        loading: step.completedAt ? 'Unmarking step...' : 'Completing step...',
        success: step.completedAt
          ? 'Step unmarked successfully'
          : 'Step completed successfully',
        error: 'Failed to update step',
      },
      onSuccess: () => {
        onStepsChange?.();
      },
    });
  }

  async function handleToggleSkipped(step: PurchaseStep) {
    if (!editable) return;

    await handleError(togglePurchaseStepSkipped(step.id), {
      toast: {
        loading: step.skipped ? 'Unmarking step...' : 'Skipping step...',
        success: step.skipped
          ? 'Step unmarked successfully'
          : 'Step skipped successfully',
        error: 'Failed to update step',
      },
      onSuccess: () => {
        onStepsChange?.();
      },
    });
  }

  async function handleDelete(step: PurchaseStep) {
    if (!editable) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this step?',
    );
    if (!confirmed) return;

    await handleError(deletePurchaseStep(step.id), {
      toast: {
        loading: 'Deleting step...',
        success: 'Step deleted successfully',
        error: 'Failed to delete step',
      },
      onSuccess: () => {
        onStepsChange?.();
      },
    });
  }

  async function handleSaveEdit(step: PurchaseStep) {
    if (!editingName.trim()) {
      toast.error('Step name cannot be empty');
      return;
    }

    await handleError(
      updatePurchaseStep({ id: step.id, name: editingName.trim() }),
      {
        toast: {
          loading: 'Updating step...',
          success: 'Step updated successfully',
          error: 'Failed to update step',
        },
        onSuccess: () => {
          setEditingStepId(null);
          setEditingName('');
          onStepsChange?.();
        },
      },
    );
  }

  function startEdit(step: PurchaseStep) {
    setEditingStepId(step.id);
    setEditingName(step.name);
  }

  function cancelEdit() {
    setEditingStepId(null);
    setEditingName('');
  }

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-muted-foreground text-sm font-medium">
          {completedSteps}/{totalSteps}
        </span>
      </div>

      {/* Steps List */}
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => {
          const isCompleted = !!step.completedAt;
          const isSkipped = step.skipped;
          const isEditing = editingStepId === step.id;

          return (
            <div
              key={step.id}
              className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all ${
                isCompleted
                  ? 'border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400'
                  : isSkipped
                    ? 'border-muted bg-muted/50 text-muted-foreground line-through'
                    : 'border-border bg-background'
              }`}
            >
              {/* Status Icon */}
              <button
                onClick={() => handleToggleComplete(step)}
                disabled={!editable || isEditing}
                className="shrink-0 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isCompleted ? (
                  <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                ) : isSkipped ? (
                  <Slash className="size-4" />
                ) : (
                  <Circle className="text-muted-foreground size-4" />
                )}
              </button>

              {/* Step Name or Edit Input */}
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-6 w-32 px-2 py-0 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(step);
                      } else if (e.key === 'Escape') {
                        cancelEdit();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleSaveEdit(step)}
                  >
                    <Check className="size-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={cancelEdit}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <span className="text-sm font-medium">{step.name}</span>
              )}

              {/* Timestamp */}
              {isCompleted && step.completedAt && !isEditing && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="size-3" />
                  <DateTime date={step.completedAt} dateOnly />
                </span>
              )}

              {/* Actions Menu */}
              {editable && !isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hover:bg-accent shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <MoreVertical className="size-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleToggleComplete(step)}
                    >
                      <Check className="mr-2 size-4" />
                      {isCompleted ? 'Unmark Complete' : 'Mark Complete'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleSkipped(step)}>
                      <Slash className="mr-2 size-4" />
                      {isSkipped ? 'Unmark Skip' : 'Mark Skipped'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => startEdit(step)}>
                      <Edit2 className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(step)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
