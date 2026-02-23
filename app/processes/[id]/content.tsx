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
  Save,
  Trash2,
} from 'lucide-react';

import {
  restoreProcessTemplate,
  saveProcessSteps,
  softDeleteProcessTemplate,
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

type LocalStep = {
  localId: string;
  id?: string;
  name: string;
  description: string;
};

const editTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Cannot be longer than 100 characters'),
  description: z.string().max(500, 'Cannot be longer than 500 characters'),
});

type EditTemplateFormData = z.infer<typeof editTemplateSchema>;

export function Content({ template }: { template: ProcessTemplateWithSteps }) {
  const router = useRouter();

  const [steps, setSteps] = useState<LocalStep[]>(
    template.steps.map((s) => ({
      localId: s.id,
      id: s.id,
      name: s.name,
      description: s.description ?? '',
    })),
  );
  const [deletedStepIds, setDeletedStepIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStepLocalId, setEditingStepLocalId] = useState<string | null>(
    null,
  );
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [isDeleted, setIsDeleted] = useState(!!template.deletedAt);

  useEffect(() => {
    setSteps(
      template.steps.map((s) => ({
        localId: s.id,
        id: s.id,
        name: s.name,
        description: s.description ?? '',
      })),
    );
    setDeletedStepIds([]);
    setHasChanges(false);
    setIsDeleted(!!template.deletedAt);
  }, [template]);

  function startEditing(step: LocalStep) {
    setEditingStepLocalId(step.localId);
    setEditName(step.name);
    setEditDescription(step.description);
  }

  function cancelEditing() {
    setEditingStepLocalId(null);
    setEditName('');
    setEditDescription('');
  }

  function saveEditing(localId: string) {
    if (!editName.trim()) return;
    setSteps((prev) =>
      prev.map((s) =>
        s.localId === localId
          ? { ...s, name: editName.trim(), description: editDescription.trim() }
          : s,
      ),
    );
    cancelEditing();
    setHasChanges(true);
  }

  function deleteStep(localId: string) {
    const step = steps.find((s) => s.localId === localId);
    if (step?.id) setDeletedStepIds((prev) => [...prev, step.id!]);
    setSteps((prev) => prev.filter((s) => s.localId !== localId));
    setHasChanges(true);
  }

  function moveStep(localId: string, direction: 'up' | 'down') {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.localId === localId);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const newSteps = [...prev];
      [newSteps[idx], newSteps[newIdx]] = [newSteps[newIdx], newSteps[idx]];
      return newSteps;
    });
    setHasChanges(true);
  }

  function addStep() {
    if (!newStepName.trim()) return;
    setSteps((prev) => [
      ...prev,
      {
        localId: `new-${Date.now()}`,
        name: newStepName.trim(),
        description: newStepDescription.trim(),
      },
    ]);
    setNewStepName('');
    setNewStepDescription('');
    setShowAddForm(false);
    setHasChanges(true);
  }

  async function handleSaveSteps() {
    setIsSaving(true);
    await handleError(
      saveProcessSteps(
        template.id,
        steps.map((s, i) => ({
          id: s.id,
          name: s.name,
          description: s.description || undefined,
          order: i,
        })),
        deletedStepIds,
      ),
      {
        toast: {
          loading: 'Saving changes...',
          success: 'Changes saved successfully',
          error: 'Failed to save changes',
        },
        onSuccess: () => {
          setHasChanges(false);
          setDeletedStepIds([]);
          router.refresh();
        },
      },
    );
    setIsSaving(false);
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

  async function handleEditTemplate(
    data: EditTemplateFormData,
  ): Promise<boolean> {
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
        onSuccess: () => {
          router.refresh();
        },
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreTemplate}
              >
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
              disabled={showAddForm}
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
          <Card key={step.localId} className="p-4">
            {editingStepLocalId === step.localId ? (
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
                    onClick={() => saveEditing(step.localId)}
                    disabled={!editName.trim()}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
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
                      onClick={() => moveStep(step.localId, 'up')}
                      disabled={idx === 0}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => moveStep(step.localId, 'down')}
                      disabled={idx === steps.length - 1}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => startEditing(step)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive size-8"
                      onClick={() => deleteStep(step.localId)}
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
                  onClick={addStep}
                  disabled={!newStepName.trim()}
                >
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
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {!isDeleted && hasChanges && (
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveSteps} disabled={isSaving}>
            {isSaving && <Loader2 className="animate-spin" />}
            <Save className="size-4" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
