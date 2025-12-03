'use client';

import { z } from 'zod/v4';

import { createCategory } from '@/prisma/services/category';

import { handleError, isError } from '@/lib/utils';

import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';

const schema = z.object({
  designationId: z.string().min(1, 'Please select a designation'),
  code: z.string().length(4, 'Must be exactly 4 characters long'),
  name: z.string().min(1, 'Please enter a category name'),
  amount: z.coerce
    .number<number>()
    .min(0.01, 'Must be at least $0.01')
    .multipleOf(0.01, 'Must contain at most 2 decimal places'),
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
      defaultValues={{ designationId, code: '', name: '', amount: 0 }}
      onSubmit={onSubmit}
    >
      <FormInput<FormData> name="name" label="Name" placeholder="Food" />
      <FormInput<FormData>
        name="code"
        label="Code"
        placeholder="7XXX"
        description="The spending category number to be associated with this category."
      />
      <FormInput<FormData>
        name="amount"
        label="Amount"
        placeholder="$21.45"
        currency
      />
    </FormDialog>
  );
}
