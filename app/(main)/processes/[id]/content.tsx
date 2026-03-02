'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
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
import { z } from 'zod/v4';

import {
  addProcessStep,
  deleteProcessStep,
  deleteProcessTemplate,
  moveProcessStep,
  restoreProcessTemplate,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';
import { FormTextarea } from '@/components/ui/form-textarea';

type LocalStep = { id: string; name: string; description: string };

const stepSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Cannot be longer than 100 characters'),
  description: z.string().max(500, 'Cannot be longer than 500 characters'),
});
type StepFormData = z.infer<typeof stepSchema>;

const templateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Cannot be longer than 100 characters'),
  description: z.string().max(500, 'Cannot be longer than 500 characters'),
});
type TemplateFormData = z.infer<typeof templateSchema>;

function StepCard({
  step,
  idx,
  total,
  isMutating,
  onEdit,
  onDelete,
  onMove,
}: {
  step: LocalStep;
  idx: number;
  total: number;
  isMutating: boolean;
  onEdit: (id: string, data: StepFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, dir: 'up' | 'down') => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const form = useForm<StepFormData>({
    resolver: zodResolver(stepSchema),
    defaultValues: { name: step.name, description: step.description },
  });

  async function onSubmit(data: StepFormData) {
    await onEdit(step.id, data);
    setEditing(false);
  }

  if (editing)
    return (
      <Card className="p-4">
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-3"
          >
            <FormInput<StepFormData> name="name" label="Name" autoFocus />
            <FormTextarea<StepFormData>
              name="description"
              label="Description"
              placeholder="Optional"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={form.formState.isSubmitting || isMutating}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="animate-spin" />
                )}
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  form.reset();
                }}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </FormProvider>
      </Card>
    );

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-muted-foreground bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
            {idx + 1}
          </span>
          <div>
            <p className="font-medium">{step.name}</p>
            {step.description && (
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => onMove(step.id, 'up')}
            disabled={idx === 0 || isMutating}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => onMove(step.id, 'down')}
            disabled={idx === total - 1 || isMutating}
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => setEditing(true)}
            disabled={isMutating}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive size-8"
            onClick={() => onDelete(step.id)}
            disabled={isMutating}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AddStepCard({
  isMutating,
  onAdd,
  onCancel,
}: {
  isMutating: boolean;
  onAdd: (data: StepFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const form = useForm<StepFormData>({
    resolver: zodResolver(stepSchema),
    defaultValues: { name: '', description: '' },
  });

  return (
    <Card className="p-4">
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onAdd)}
          className="flex flex-col gap-3"
        >
          <p className="text-sm font-medium">New Step</p>
          <FormInput<StepFormData> name="name" label="Name" autoFocus />
          <FormTextarea<StepFormData>
            name="description"
            label="Description"
            placeholder="Optional"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={form.formState.isSubmitting || isMutating}
            >
              {form.formState.isSubmitting && (
                <Loader2 className="animate-spin" />
              )}
              Add Step
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </FormProvider>
    </Card>
  );
}

export function Content({ template }: { template: ProcessTemplateWithSteps }) {
  const router = useRouter();
  const isDeleted = template.deletedAt !== null;

  const [steps, setSteps] = useState<LocalStep[]>(
    template.steps.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? '',
    })),
  );
  const [isMutating, setIsMutating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleEditStep(stepId: string, data: StepFormData) {
    setIsMutating(true);
    const prev = [...steps];
    setSteps((s) =>
      s.map((step) => (step.id === stepId ? { ...step, ...data } : step)),
    );
    try {
      await handleError(
        updateProcessStep(stepId, template.id, {
          name: data.name,
          description: data.description || undefined,
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
      setIsMutating(false);
    }
  }

  async function handleDeleteStep(stepId: string) {
    setIsMutating(true);
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
      setIsMutating(false);
    }
  }

  async function handleMoveStep(stepId: string, direction: 'up' | 'down') {
    setIsMutating(true);
    const prev = [...steps];
    const idx = steps.findIndex((s) => s.id === stepId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx >= 0 && swapIdx < steps.length) {
      const next = [...steps];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      setSteps(next);
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
      setIsMutating(false);
    }
  }

  async function handleAddStep(data: StepFormData) {
    setIsMutating(true);
    try {
      await handleError(
        addProcessStep(template.id, {
          name: data.name,
          description: data.description || undefined,
        }),
        {
          toast: {
            loading: 'Adding step...',
            success: 'Step added',
            error: 'Failed to add step',
          },
          onSuccess: () => {
            setShowAddForm(false);
            router.refresh();
          },
        },
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteTemplate() {
    setIsDeleting(true);
    await handleError(deleteProcessTemplate(template.id), {
      toast: {
        loading: 'Deleting template...',
        success: 'Template deleted',
        error: 'Failed to delete template',
      },
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        router.refresh();
      },
    });
    setIsDeleting(false);
  }

  async function handleRestoreTemplate() {
    setIsRestoring(true);
    await handleError(restoreProcessTemplate(template.id), {
      toast: {
        loading: 'Restoring template...',
        success: 'Template restored',
        error: 'Failed to restore template',
      },
      onSuccess: () => router.refresh(),
    });
    setIsRestoring(false);
  }

  async function handleEditTemplate(data: TemplateFormData): Promise<boolean> {
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
        description={template.description ? `${template.description} · Global` : 'Global'}
        actions={
          <div className="flex gap-2">
            <Link href="/processes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-4" />
                Back
              </Button>
            </Link>
            {!isDeleted && (
              <FormDialog
                key={template.updatedAt.toString()}
                trigger={
                  <Button variant="outline" size="sm">
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                }
                title="Edit Template"
                description="Update the template name and description."
                schema={templateSchema}
                defaultValues={{
                  name: template.name,
                  description: template.description ?? '',
                }}
                onSubmit={handleEditTemplate}
                submitLabel="Save Changes"
              >
                <FormInput<TemplateFormData>
                  name="name"
                  label="Name"
                  placeholder="Procurement Process"
                />
                <FormTextarea<TemplateFormData>
                  name="description"
                  label="Description"
                  placeholder="Describe the purpose of this process template..."
                />
              </FormDialog>
            )}
            {isDeleted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreTemplate}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                Restore
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            )}
          </div>
        }
      />

      <SectionHeader
        title="Steps"
        actions={
          !isDeleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(true)}
              disabled={showAddForm || isMutating}
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
          <StepCard
            key={step.id}
            step={step}
            idx={idx}
            total={steps.length}
            isMutating={isMutating || isDeleted}
            onEdit={handleEditStep}
            onDelete={handleDeleteStep}
            onMove={handleMoveStep}
          />
        ))}
        {showAddForm && !isDeleted && (
          <AddStepCard
            isMutating={isMutating}
            onAdd={handleAddStep}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="text-destructive size-5" />
              Delete Template
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{template.name}</strong>?
              This process will no longer be available for new purchases.
              Existing purchases will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
