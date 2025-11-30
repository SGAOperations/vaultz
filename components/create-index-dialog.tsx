'use client';

import { z } from 'zod/v4';

import { createIndex } from '@/prisma/services';

import { handleError, isError } from '@/lib/utils';

import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';

const schema = z.object({
  name: z
    .string()
    .min(2, 'Must be at least 2 characters')
    .max(50, 'Cannot be longer than 50 characters'),
  code: z.string().length(6, 'Must be exactly 6 characters long'),
});

type FormData = z.infer<typeof schema>;

export function CreateIndexDialog({ trigger }: { trigger: React.ReactNode }) {
  async function onSubmit(data: FormData): Promise<boolean> {
    const result = await handleError(createIndex(data), {
      toast: {
        loading: 'Creating index...',
        success: 'Index created successfully',
        error: 'Failed to create index',
      },
    });
    return !isError(result);
  }

  return (
    <FormDialog
      trigger={trigger}
      title="Create Index"
      description="An index contains multiple accounts that track purchases."
      schema={schema}
      defaultValues={{ name: '', code: '' }}
      onSubmit={onSubmit}
    >
      <FormInput<FormData>
        name="name"
        label="Name"
        placeholder="Budget Index"
      />
      <FormInput<FormData>
        name="code"
        label="Code"
        placeholder="80XXXX"
        description="The index number to be associated with this index."
      />
    </FormDialog>
  );
}
