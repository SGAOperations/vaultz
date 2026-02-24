'use client';

import { z } from 'zod/v4';

import { createCategory } from '@/prisma/services/category';

import { handleError, isError } from '@/lib/utils';

import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';

const schema = z.object({
  designationId: z.string().min(1, 'Please select a designation'),
  code: z
    .string()
    .length(3, 'Must be exactly 3 numbers')
    .regex(/^\d{3}$/, 'Must be 3 numeric digits'),
  ledgerCode: z.string().length(4, 'Must be exactly 4 characters long'),
  name: z.string().min(1, 'Please enter a category name'),
});

type FormData = z.infer<typeof schema>;

export function CreateCategoryDialog({
  designationId,
  trigger,
}: {
  designationId: string;
  trigger: React.ReactNode;
}) {
  async function onSubmit(data: FormData): Promise<boolean> {
    const result = await handleError(createCategory(data), {
      toast: {
        loading: 'Creating spending category...',
        success: 'Spending category created successfully',
        error: 'Failed to create spending category',
      },
    });
    return !isError(result);
  }

  return (
    <FormDialog
      trigger={trigger}
      title="Create Spending Category"
      description="Each spending category has a set budget."
      schema={schema}
      defaultValues={{ designationId, code: '', ledgerCode: '', name: '' }}
      onSubmit={onSubmit}
    >
      <FormInput<FormData> name="name" label="Name" placeholder="Food" />
      <FormInput<FormData>
        name="code"
        label="Spending Category Code"
        placeholder="123"
        description="Enter 3 numbers (displayed with SC prefix, e.g., SC123)."
      />
      <FormInput<FormData>
        name="ledgerCode"
        label="Ledger Code"
        placeholder="7XXX"
        description="The ledger code to be associated with this category."
      />
    </FormDialog>
  );
}
