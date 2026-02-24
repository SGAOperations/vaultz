'use client';

import { z } from 'zod/v4';

import { createAllocationGroup } from '@/prisma/services/allocation-groups';

import { handleError, isError } from '@/lib/utils';

import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';

const schema = z.object({
  name: z
    .string()
    .min(2, 'Must be at least 2 characters')
    .max(50, 'Cannot be longer than 50 characters'),
});

type FormData = z.infer<typeof schema>;

export function CreateAllocationGroupDialog({
  trigger,
  designationId,
}: {
  trigger: React.ReactNode;
  designationId: string;
}) {
  async function onSubmit(data: FormData): Promise<boolean> {
    const result = await handleError(
      createAllocationGroup({ ...data, designationId }),
      {
        toast: {
          loading: 'Creating allocation group...',
          success: 'Allocation group created successfully',
          error: 'Failed to create allocation group',
        },
      },
    );
    return !isError(result);
  }

  return (
    <FormDialog
      trigger={trigger}
      title="Create Allocation Group"
      description="An allocation group contains multiple allocations that track expenses."
      schema={schema}
      defaultValues={{ name: '' }}
      onSubmit={onSubmit}
    >
      <FormInput<FormData>
        name="name"
        label="Name"
        placeholder="Office of the President"
      />
    </FormDialog>
  );
}
