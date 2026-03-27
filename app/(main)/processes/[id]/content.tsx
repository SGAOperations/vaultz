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
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { z } from 'zod/v4';

import {
  addBranchStep,
  addProcessStep,
  deleteProcessStep,
  deleteProcessTemplate,
  moveProcessStep,
  restoreProcessTemplate,
  updateProcessStep,
  updateProcessTemplate,
} from '@/prisma/services/process-templates';

import {
  ProcessStepNode,
  ProcessTemplateWithSequence,
} from '@/lib/types';
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

type LocalStepNode = {
  id: string;
  name: string;
  description: string | null;
  previousStepId: string | null;
  branches: LocalStepSequence[];
};
type LocalStepSequence = LocalStepNode[];

type AddFormState =
  | { type: 'root' }
  | { type: 'branch'; parentStepId: string }
  | null;

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

function toLocalNode(node: ProcessStepNode): LocalStepNode {
  return {
    id: node.id,
    name: node.name,
    description: node.description,
    previousStepId: node.previousStepId,
    branches: node.branches.map((branch) => branch.map(toLocalNode)),
  };
}

function AddStepForm({
  label,
  isMutating,
  onAdd,
  onCancel,
}: {
  label: string;
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
          <p className="text-sm font-medium">{label}</p>
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

function StepCard({
  step,
  idx,
  total,
  isMutating,
  isDeleted,
  addFormState,
  onEdit,
  onDelete,
  onMove,
  onAddBranch,
  onCancelAdd,
  onAddBranchSubmit,
}: {
  step: LocalStepNode;
  idx: number;
  total: number;
  isMutating: boolean;
  isDeleted: boolean;
  addFormState: AddFormState;
  onEdit: (id: string, data: StepFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, dir: 'up' | 'down') => Promise<void>;
  onAddBranch: (stepId: string) => void;
  onCancelAdd: () => void;
  onAddBranchSubmit: (
    siblingStepId: string,
    data: StepFormData,
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const form = useForm<StepFormData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      name: step.name,
      description: step.description ?? '',
    },
  });

  async function onSubmit(data: StepFormData) {
    await onEdit(step.id, data);
    setEditing(false);
  }

  const showBranchForm =
    addFormState !== null &&
    addFormState.type === 'branch' &&
    addFormState.parentStepId === step.id;

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
    <div className="flex flex-col gap-2">
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
          {!isDeleted && (
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
                className="size-8"
                onClick={() => onAddBranch(step.id)}
                disabled={isMutating || addFormState !== null}
                title="Add Branch"
              >
                <GitBranch className="size-4" />
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
          )}
        </div>
      </Card>

      {step.branches.length > 0 && (
        <div className="ml-6 flex flex-col gap-4 border-l-2 border-dashed pl-4">
          {step.branches.map((branch, branchIdx) => (
            <div key={branchIdx} className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Branch {branchIdx + 1}
              </p>
              <SequenceList
                sequence={branch}
                isMutating={isMutating}
                isDeleted={isDeleted}
                addFormState={addFormState}
                onEdit={onEdit}
                onDelete={onDelete}
                onMove={onMove}
                onAddBranch={onAddBranch}
                onCancelAdd={onCancelAdd}
                onAddBranchSubmit={onAddBranchSubmit}
              />
            </div>
          ))}
        </div>
      )}

      {showBranchForm && (
        <div className="ml-6 border-l-2 border-dashed pl-4">
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              New Branch
            </p>
            <AddStepForm
              label="New Branch Step"
              isMutating={isMutating}
              onAdd={(data) => onAddBranchSubmit(step.id, data)}
              onCancel={onCancelAdd}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SequenceList({
  sequence,
  isMutating,
  isDeleted,
  addFormState,
  onEdit,
  onDelete,
  onMove,
  onAddBranch,
  onCancelAdd,
  onAddBranchSubmit,
}: {
  sequence: LocalStepSequence;
  isMutating: boolean;
  isDeleted: boolean;
  addFormState: AddFormState;
  onEdit: (id: string, data: StepFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, dir: 'up' | 'down') => Promise<void>;
  onAddBranch: (stepId: string) => void;
  onCancelAdd: () => void;
  onAddBranchSubmit: (
    siblingStepId: string,
    data: StepFormData,
  ) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {sequence.map((step, idx) => (
        <StepCard
          key={step.id}
          step={step}
          idx={idx}
          total={sequence.length}
          isMutating={isMutating}
          isDeleted={isDeleted}
          addFormState={addFormState}
          onEdit={onEdit}
          onDelete={onDelete}
          onMove={onMove}
          onAddBranch={onAddBranch}
          onCancelAdd={onCancelAdd}
          onAddBranchSubmit={onAddBranchSubmit}
        />
      ))}
    </div>
  );
}

export function Content({
  template,
}: {
  template: ProcessTemplateWithSequence;
}) {
  const router = useRouter();
  const isDeleted = template.deletedAt !== null;

  const [rootSequence, setRootSequence] = useState<LocalStepSequence>(
    template.rootSequence.map(toLocalNode),
  );
  const [isMutating, setIsMutating] = useState(false);
  const [addFormState, setAddFormState] = useState<AddFormState>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  function updateNodeInSequence(
    seq: LocalStepSequence,
    stepId: string,
    updater: (node: LocalStepNode) => LocalStepNode,
  ): LocalStepSequence {
    return seq.map((node) => {
      if (node.id === stepId) return updater(node);
      return {
        ...node,
        branches: node.branches.map((branch) =>
          updateNodeInSequence(branch, stepId, updater),
        ),
      };
    });
  }

  function removeNodeFromSequence(
    seq: LocalStepSequence,
    stepId: string,
  ): LocalStepSequence {
    return seq
      .filter((node) => node.id !== stepId)
      .map((node) => ({
        ...node,
        branches: node.branches.map((branch) =>
          removeNodeFromSequence(branch, stepId),
        ),
      }));
  }

  async function handleEditStep(stepId: string, data: StepFormData) {
    setIsMutating(true);
    const prev = rootSequence;
    setRootSequence((seq) =>
      updateNodeInSequence(seq, stepId, (node) => ({
        ...node,
        name: data.name,
        description: data.description || null,
      })),
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
          onError: () => setRootSequence(prev),
        },
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteStep(stepId: string) {
    setIsMutating(true);
    const prev = rootSequence;
    setRootSequence((seq) => removeNodeFromSequence(seq, stepId));
    try {
      await handleError(deleteProcessStep(stepId, template.id), {
        toast: {
          loading: 'Deleting step...',
          success: 'Step deleted',
          error: 'Failed to delete step',
        },
        onSuccess: () => router.refresh(),
        onError: () => setRootSequence(prev),
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function handleMoveStep(stepId: string, direction: 'up' | 'down') {
    setIsMutating(true);
    try {
      await handleError(moveProcessStep(template.id, stepId, direction), {
        toast: {
          loading: 'Moving step...',
          success: 'Step moved',
          error: 'Failed to move step',
        },
        onSuccess: () => router.refresh(),
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function handleAddRootStep(data: StepFormData) {
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
            setAddFormState(null);
            router.refresh();
          },
        },
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function handleAddBranchStep(
    siblingStepId: string,
    data: StepFormData,
  ) {
    setIsMutating(true);
    try {
      await handleError(
        addBranchStep(template.id, siblingStepId, {
          name: data.name,
          description: data.description || undefined,
        }),
        {
          toast: {
            loading: 'Adding branch...',
            success: 'Branch added',
            error: 'Failed to add branch',
          },
          onSuccess: () => {
            setAddFormState(null);
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

  const isEmpty = rootSequence.length === 0 && addFormState === null;

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
              onClick={() => setAddFormState({ type: 'root' })}
              disabled={addFormState !== null || isMutating}
            >
              <Plus className="size-4" />
              Add Step
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-2">
        {isEmpty && (
          <EmptyState
            message="No steps yet"
            description="Add steps to define the workflow for this process template"
          />
        )}

        <SequenceList
          sequence={rootSequence}
          isMutating={isMutating || isDeleted}
          isDeleted={isDeleted}
          addFormState={addFormState}
          onEdit={handleEditStep}
          onDelete={handleDeleteStep}
          onMove={handleMoveStep}
          onAddBranch={(stepId) =>
            setAddFormState({ type: 'branch', parentStepId: stepId })
          }
          onCancelAdd={() => setAddFormState(null)}
          onAddBranchSubmit={handleAddBranchStep}
        />

        {addFormState?.type === 'root' && !isDeleted && (
          <AddStepForm
            label="New Step"
            isMutating={isMutating}
            onAdd={handleAddRootStep}
            onCancel={() => setAddFormState(null)}
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
