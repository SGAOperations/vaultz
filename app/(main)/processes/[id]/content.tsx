'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment } from 'react';
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

import { ProcessStepNode, ProcessTemplateWithStepTree } from '@/lib/types';
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
  description: string;
  children: LocalStepNode[];
};

type AddFormState =
  | { type: 'root' }
  | { type: 'branch'; siblingStepId: string }
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

function fromStepNode(node: ProcessStepNode): LocalStepNode {
  return {
    id: node.id,
    name: node.name,
    description: node.description ?? '',
    children: node.children.map(fromStepNode),
  };
}

function updateNodeInTree(
  nodes: LocalStepNode[],
  id: string,
  update: Partial<Omit<LocalStepNode, 'children'>>,
): LocalStepNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, ...update };
    return { ...node, children: updateNodeInTree(node.children, id, update) };
  });
}

function removeNodeFromTree(
  nodes: LocalStepNode[],
  id: string,
): LocalStepNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeNodeFromTree(n.children, id) }));
}

function countNodes(nodes: LocalStepNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countNodes(n.children), 0);
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
              Add
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
  node,
  siblingIdx,
  siblingCount,
  isMutating,
  onEdit,
  onDelete,
  onMove,
  onAddBranch,
}: {
  node: LocalStepNode;
  siblingIdx: number;
  siblingCount: number;
  isMutating: boolean;
  onEdit: (id: string, data: StepFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, dir: 'up' | 'down') => Promise<void>;
  onAddBranch: (stepId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const form = useForm<StepFormData>({
    resolver: zodResolver(stepSchema),
    defaultValues: { name: node.name, description: node.description },
  });

  async function onSubmit(data: StepFormData) {
    await onEdit(node.id, data);
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
            {siblingIdx + 1}
          </span>
          <div>
            <p className="font-medium">{node.name}</p>
            {node.description && (
              <p className="text-muted-foreground text-sm">
                {node.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => onMove(node.id, 'up')}
            disabled={siblingIdx === 0 || isMutating}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => onMove(node.id, 'down')}
            disabled={siblingIdx === siblingCount - 1 || isMutating}
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            title="Add branch at this level"
            onClick={() => onAddBranch(node.id)}
            disabled={isMutating}
          >
            <GitBranch className="size-4" />
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
            onClick={() => onDelete(node.id)}
            disabled={isMutating}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function StepGroup({
  nodes,
  depth,
  isMutating,
  addFormState,
  onEdit,
  onDelete,
  onMove,
  onAddBranch,
  onAddFormSubmit,
  onAddFormCancel,
}: {
  nodes: LocalStepNode[];
  depth: number;
  isMutating: boolean;
  addFormState: AddFormState;
  onEdit: (id: string, data: StepFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, dir: 'up' | 'down') => Promise<void>;
  onAddBranch: (stepId: string) => void;
  onAddFormSubmit: (data: StepFormData) => Promise<void>;
  onAddFormCancel: () => void;
}) {
  const showBranchForm =
    addFormState?.type === 'branch' &&
    nodes.some((n) => n.id === addFormState.siblingStepId);

  const groupProps = {
    isMutating,
    addFormState,
    onEdit,
    onDelete,
    onMove,
    onAddBranch,
    onAddFormSubmit,
    onAddFormCancel,
  };

  return (
    <div
      className={
        depth > 0
          ? 'border-muted ml-5 flex flex-col gap-2 border-l-2 pl-4'
          : 'flex flex-col gap-2'
      }
    >
      {nodes.map((node, idx) => (
        <Fragment key={node.id}>
          <StepCard
            node={node}
            siblingIdx={idx}
            siblingCount={nodes.length}
            isMutating={isMutating || (showBranchForm && !isMutating)}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
            onAddBranch={onAddBranch}
          />
          {node.children.length > 0 && (
            <StepGroup
              nodes={node.children}
              depth={depth + 1}
              {...groupProps}
            />
          )}
        </Fragment>
      ))}
      {showBranchForm && (
        <AddStepForm
          label="New Branch"
          isMutating={isMutating}
          onAdd={onAddFormSubmit}
          onCancel={onAddFormCancel}
        />
      )}
    </div>
  );
}

export function Content({
  template,
}: {
  template: ProcessTemplateWithStepTree;
}) {
  const router = useRouter();
  const isDeleted = template.deletedAt !== null;

  const [steps, setSteps] = useState<LocalStepNode[]>(
    template.steps.map(fromStepNode),
  );
  const [isMutating, setIsMutating] = useState(false);
  const [addFormState, setAddFormState] = useState<AddFormState>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleEditStep(stepId: string, data: StepFormData) {
    setIsMutating(true);
    const prev = steps;
    setSteps(updateNodeInTree(steps, stepId, data));
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
    const prev = steps;
    setSteps(removeNodeFromTree(steps, stepId));
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
            setAddFormState(null);
            router.refresh();
          },
        },
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function handleAddBranchSubmit(data: StepFormData) {
    if (addFormState?.type !== 'branch') return;
    setIsMutating(true);
    try {
      await handleError(
        addBranchStep(template.id, addFormState.siblingStepId, {
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
        {countNodes(steps) === 0 && addFormState === null && (
          <EmptyState
            message="No steps yet"
            description="Add steps to define the workflow for this process template"
          />
        )}
        <StepGroup
          nodes={steps}
          depth={0}
          isMutating={isMutating || isDeleted}
          addFormState={addFormState}
          onEdit={handleEditStep}
          onDelete={handleDeleteStep}
          onMove={handleMoveStep}
          onAddBranch={(stepId) =>
            setAddFormState({ type: 'branch', siblingStepId: stepId })
          }
          onAddFormSubmit={handleAddBranchSubmit}
          onAddFormCancel={() => setAddFormState(null)}
        />
        {addFormState?.type === 'root' && !isDeleted && (
          <AddStepForm
            label="New Step"
            isMutating={isMutating}
            onAdd={handleAddStep}
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
