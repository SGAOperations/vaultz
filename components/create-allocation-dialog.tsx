'use client';

import { z } from 'zod/v4';

import { createAllocation } from '@/prisma/services/allocation';

import { handleError, isError } from '@/lib/utils';

import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';

const schema = z.object({
  name: z
    .string()
    .min(2, 'Must be at least 2 characters')
    .max(50, 'Cannot be longer than 50 characters'),
  amount: z.coerce
    .number<number>()
    .min(0.01, 'Must be at least $0.01')
    .multipleOf(0.01, 'Must contain at most 2 decimal places'),
});

type FormData = z.infer<typeof schema>;

export function CreateAllocationDialog({
  trigger,
  designationId,
  allocationGroupId,
}: {
  trigger: React.ReactNode;
  designationId: string;
  allocationGroupId?: string;
}) {
  async function onSubmit(data: FormData): Promise<boolean> {
    const result = await handleError(
      createAllocation({ ...data, designationId, allocationGroupId }),
      {
        toast: {
          loading: 'Creating allocation...',
          success: 'Allocation created successfully',
          error: 'Failed to create allocation',
        },
      },
    );
    return !isError(result);
  }

  return (
    <FormDialog
      trigger={trigger}
      title="Create Allocation"
      description="An allocation is a budgeted amount of money for a specific purpose."
      schema={schema}
      defaultValues={{ name: '', amount: 0 }}
      onSubmit={onSubmit}
    >
      <FormInput<FormData>
        name="name"
        label="Name"
        placeholder="Sustainability Tabling"
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
