'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { z } from 'zod/v4';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import {
  addProcessStep,
  deleteProcessStep,
  moveProcessStep,
  restoreProcessTemplate,
  softDeleteProcessTemplate,
  updateProcessStep,
  updateProcessTemplate,
} from '@/prisma/services/process-templates';

import { ProcessTemplateWithSteps } from '@/lib/types';
import { handleError, isError } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';
import { FormTextarea } from '@/components/ui/form-textarea';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type LocalStep = { id: string; name: string; description: string };

const editTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Cannot be longer than 100 characters'),
  description: z.string().max(500, 'Cannot be longer than 500 characters'),
});

type EditTemplateFormData = z.infer<typeof editTemplateSchema>;

function toLocalSteps(t: ProcessTemplateWithSteps): LocalStep[] {
  return t.steps.map((s) => ({ id: s.id, name: s.name, description: s.description ?? '' }));
}

export function Content({ template }: { template: ProcessTemplateWithSteps }) {
  const router = useRouter();

  const [steps, setSteps] = useState<LocalStep[]>(toLocalSteps(template));
  const [isDeleted, setIsDeleted] = useState(!!template.deletedAt);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSteps(toLocalSteps(template));
    setIsDeleted(!!template.deletedAt);
  }, [template]);

  function startEditing(step: LocalStep) {
    setEditingStepId(step.id);
    setEditName(step.name);
    setEditDescription(step.description);
  }

  function cancelEditing() {
    setEditingStepId(null);
    setEditName('');
    setEditDescription('');
  }

  async function handleEditStep(stepId: string) {
    if (!editName.trim()) return;
    setIsLoading(true);
    const prev = [...steps];
    setSteps((s) =>
      s.map((step) =>
        step.id === stepId
          ? { ...step, name: editName.trim(), description: editDescription.trim() }
          : step,
      ),
    );
    cancelEditing();
    try {
      await handleError(
        updateProcessStep(stepId, template.id, {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        }),
        {
          toast: {
            loading: 'Updating step...',
            success: 'Step updated',
            error: 'Failed to update step',
          },
          onSuccess: () => router.refresh(),
          onError: () => setSteps(prev),
        },
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteStep(stepId: string) {
    setIsLoading(true);
    const prev = [...steps];
    setSteps((s) => s.filter((step) => step.id !== stepId));
    try {
      await handleError(deleteProcessStep(stepId, template.id), {
        toast: {
          loading: 'Deleting step...',
          success: 'Step deleted',
          error: 'Failed to delete step',
        },
        onSuccess: () => router.refresh(),
        onError: () => setSteps(prev),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMoveStep(stepId: string, direction: 'up' | 'down') {
    setIsLoading(true);
    const prev = [...steps];
    const idx = steps.findIndex((s) => s.id === stepId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx >= 0 && swapIdx < steps.length) {
      const newSteps = [...steps];
      [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
      setSteps(newSteps);
    }
    try {
      await handleError(moveProcessStep(template.id, stepId, direction), {
        toast: {
          loading: 'Moving step...',
          success: 'Step moved',
          error: 'Failed to move step',
        },
        onSuccess: () => router.refresh(),
        onError: () => setSteps(prev),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddStep() {
    if (!newStepName.trim()) return;
    setIsLoading(true);
    try {
      await handleError(
        addProcessStep(template.id, {
          name: newStepName.trim(),
          description: newStepDescription.trim() || undefined,
        }),
        {
          toast: {
            loading: 'Adding step...',
            success: 'Step added',
            error: 'Failed to add step',
          },
          onSuccess: () => {
            setShowAddForm(false);
            setNewStepName('');
            setNewStepDescription('');
            router.refresh();
          },
        },
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteTemplate() {
    await handleError(softDeleteProcessTemplate(template.id), {
      toast: {
        loading: 'Deleting template...',
        success: 'Template deleted',
        error: 'Failed to delete template',
      },
      onSuccess: () => {
        setIsDeleted(true);
        router.refresh();
      },
    });
  }

  async function handleRestoreTemplate() {
    await handleError(restoreProcessTemplate(template.id), {
      toast: {
        loading: 'Restoring template...',
        success: 'Template restored',
        error: 'Failed to restore template',
      },
      onSuccess: () => {
        setIsDeleted(false);
        router.refresh();
      },
    });
  }

  async function handleEditTemplate(data: EditTemplateFormData): Promise<boolean> {
    const result = await handleError(
      updateProcessTemplate(template.id, {
        name: data.name,
        description: data.description || undefined,
      }),
      {
        toast: {
          loading: 'Updating template...',
          success: 'Template updated',
          error: 'Failed to update template',
        },
        onSuccess: () => router.refresh(),
      },
    );
    return !isError(result);
  }

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={template.name}
        description={template.description ?? undefined}
        actions={
          <div className="flex gap-2">
            <Link href="/processes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-4" />
                Back
              </Button>
            </Link>
            <FormDialog
              key={template.updatedAt.toString()}
              trigger={
                <Button variant="outline" size="sm" disabled={isDeleted}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
              }
              title="Edit Template"
              description="Update the template name and description."
              schema={editTemplateSchema}
              defaultValues={{
                name: template.name,
                description: template.description ?? '',
              }}
              onSubmit={handleEditTemplate}
              submitLabel="Save Changes"
            >
              <FormInput<EditTemplateFormData>
                name="name"
                label="Name"
                placeholder="Procurement Process"
              />
              <FormTextarea<EditTemplateFormData>
                name="description"
                label="Description"
                placeholder="Describe the purpose of this process template..."
              />
            </FormDialog>
            {isDeleted ? (
              <Button variant="outline" size="sm" onClick={handleRestoreTemplate}>
                <RotateCcw className="size-4" />
                Restore
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteTemplate}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            )}
          </div>
        }
      />

      {isDeleted && (
        <div className="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm">
          This template has been deleted. Restore it to make changes.
        </div>
      )}

      <SectionHeader
        title="Steps"
        actions={
          !isDeleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(true)}
              disabled={showAddForm || isLoading}
            >
              <Plus className="size-4" />
              Add Step
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-2">
        {steps.length === 0 && !showAddForm && (
          <EmptyState
            message="No steps yet"
            description="Add steps to define the workflow for this process template"
          />
        )}

        {steps.map((step, idx) => (
          <Card key={step.id} className="p-4">
            {editingStepId === step.id ? (
              <div className="flex flex-col gap-3">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Step name"
                  autoFocus
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditStep(step.id)}
                    disabled={!editName.trim() || isLoading}
                  >
                    {isLoading && <Loader2 className="animate-spin" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.name}</p>
                    {step.description && (
                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    )}
                  </div>
                </div>
                {!isDeleted && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => handleMoveStep(step.id, 'up')}
                      disabled={idx === 0 || isLoading}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => handleMoveStep(step.id, 'down')}
                      disabled={idx === steps.length - 1 || isLoading}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => startEditing(step)}
                      disabled={isLoading}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive size-8"
                      onClick={() => handleDeleteStep(step.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}

        {showAddForm && (
          <Card className="p-4">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">New Step</p>
              <Input
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                placeholder="Step name"
                autoFocus
              />
              <Textarea
                value={newStepDescription}
                onChange={(e) => setNewStepDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddStep}
                  disabled={!newStepName.trim() || isLoading}
                >
                  {isLoading && <Loader2 className="animate-spin" />}
                  Add Step
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewStepName('');
                    setNewStepDescription('');
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

