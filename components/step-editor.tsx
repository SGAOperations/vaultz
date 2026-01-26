'use client';

import { useState } from 'react';

import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type StepData = {
  id?: string;
  name: string;
  order: number;
  completedAt?: Date;
  skipped?: boolean;
};

export function StepEditor({
  steps: initialSteps,
  onChange,
}: {
  steps: StepData[];
  onChange: (steps: StepData[]) => void;
}) {
  const [steps, setSteps] = useState<StepData[]>(initialSteps);
  const [newStepName, setNewStepName] = useState('');

  function addStep() {
    if (!newStepName.trim()) {
      toast.error('Step name cannot be empty');
      return;
    }

    const newOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.order)) + 1 : 1;
    const newSteps = [...steps, { name: newStepName.trim(), order: newOrder }];
    setSteps(newSteps);
    onChange(newSteps);
    setNewStepName('');
  }

  function removeStep(index: number) {
    const newSteps = steps.filter((_, i) => i !== index);
    // Reorder remaining steps
    const reordered = newSteps.map((step, i) => ({ ...step, order: i + 1 }));
    setSteps(reordered);
    onChange(reordered);
  }

  function updateStepName(index: number, name: string) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], name };
    setSteps(newSteps);
    onChange(newSteps);
  }

  function moveStep(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= steps.length) return;

    const newSteps = [...steps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, movedStep);

    // Reorder
    const reordered = newSteps.map((step, i) => ({ ...step, order: i + 1 }));
    setSteps(reordered);
    onChange(reordered);
  }

  return (
    <div className="space-y-3">
      <Label>Steps</Label>

      {/* Existing Steps */}
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="border-border bg-background flex items-center gap-2 rounded-lg border p-2"
            >
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  e.preventDefault();
                  // Simple keyboard-based reordering
                }}
              >
                <GripVertical className="size-4" />
              </button>

              <span className="text-muted-foreground w-6 text-center text-sm">
                {index + 1}
              </span>

              <Input
                value={step.name}
                onChange={(e) => updateStepName(index, e.target.value)}
                placeholder="Step name"
                className="flex-1"
              />

              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => moveStep(index, index - 1)}
                  disabled={index === 0}
                  className="h-8 w-8 p-0"
                  title="Move up"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => moveStep(index, index + 1)}
                  disabled={index === steps.length - 1}
                  className="h-8 w-8 p-0"
                  title="Move down"
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeStep(index)}
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Step */}
      <div className="flex gap-2">
        <Input
          value={newStepName}
          onChange={(e) => setNewStepName(e.target.value)}
          placeholder="Add a new step..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addStep();
            }
          }}
        />
        <Button type="button" size="sm" onClick={addStep}>
          <Plus className="size-4" />
        </Button>
      </div>

      {steps.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No steps yet. Add steps to track the purchase workflow.
        </p>
      )}
    </div>
  );
}
