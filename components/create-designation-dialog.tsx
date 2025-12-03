'use client';

import { z } from 'zod/v4';

import { createDesignation } from '@/prisma/services/designation';

import { handleError, isError } from '@/lib/utils';

import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';

const schema = z.object({
  name: z
    .string()
    .min(2, 'Must be at least 2 characters')
    .max(50, 'Cannot be longer than 50 characters'),
  code: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits'),
});

type FormData = z.infer<typeof schema>;

export function CreateDesignationDialog({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  async function onSubmit(data: FormData): Promise<boolean> {
    const result = await handleError(
      createDesignation({ ...data, code: `DN${data.code}` }),
      {
        toast: {
          loading: 'Creating designation...',
          success: 'Designation created successfully',
          error: 'Failed to create designation',
        },
      },
    );
    return !isError(result);
  }

  return (
    <FormDialog
      trigger={trigger}
      title="Create Designation"
      description="A designation contains multiple spending categories that track purchases."
      schema={schema}
      defaultValues={{ name: '', code: '' }}
      onSubmit={onSubmit}
    >
      <FormInput<FormData>
        name="name"
        label="Name"
        placeholder="Budget Designation"
      />
      <FormInput<FormData>
        name="code"
        label="Code"
        placeholder="DNXXXX"
        description="The designation number to be associated with this designation."
        prefix="DN"
        numbersOnly
      />
    </FormDialog>
  );
}
