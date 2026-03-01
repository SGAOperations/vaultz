'use client';

import { useRouter } from 'next/navigation';

import { z } from 'zod/v4';

import { createProcessTemplate } from '@/prisma/services/process-templates';

import { handleError, isError } from '@/lib/utils';

import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';
import { FormTextarea } from '@/components/ui/form-textarea';

const schema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Cannot be longer than 100 characters'),
  description: z.string().max(500, 'Cannot be longer than 500 characters'),
});

type FormData = z.infer<typeof schema>;

export function CreateProcessTemplateDialog({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const router = useRouter();

  async function onSubmit(data: FormData): Promise<boolean> {
    const result = await handleError(
      createProcessTemplate({
        name: data.name,
        description: data.description || undefined,
      }),
      {
        toast: {
          loading: 'Creating process template...',
          success: 'Process template created successfully',
          error: 'Failed to create process template',
        },
        onSuccess: (template) => {
          router.push(`/processes/${template.id}`);
        },
      },
    );
    return !isError(result);
  }

  return (
    <FormDialog
      trigger={trigger}
      title="Create Process Template"
      description="Define a reusable process template with steps for tracking purchases."
      schema={schema}
      defaultValues={{ name: '', description: '' }}
      onSubmit={onSubmit}
      submitLabel="Create Template"
    >
      <FormInput<FormData>
        name="name"
        label="Name"
        placeholder="Procurement Process"
      />
      <FormTextarea<FormData>
        name="description"
        label="Description"
        placeholder="Describe the purpose of this process template..."
      />
    </FormDialog>
  );
}
