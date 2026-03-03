'use client';

import { TriangleAlert } from 'lucide-react';
import { z } from 'zod/v4';

import { createAllocation } from '@/prisma/services/allocation';

import { useInactiveSession } from '@/lib/hooks/use-inactive-session';
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
  const { isInactivePeriod, isInactiveYear, selectedPeriod, selectedYear } =
    useInactiveSession();
  const isInactiveSession = isInactivePeriod || isInactiveYear;

  const inactiveLabels = [
    isInactiveYear && selectedYear?.name,
    isInactivePeriod && selectedPeriod?.name,
  ].filter(Boolean);

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
      {isInactiveSession && (
        <div className="border-warning/30 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            You are creating an allocation in an inactive session (
            {inactiveLabels.join(' · ')}). This will not affect the current
            active period.
          </p>
        </div>
      )}
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
