'use client';

import { useFormContext } from 'react-hook-form';

import { z } from 'zod/v4';

import { transferFunds } from '@/prisma/services/transfer';

import {
  Allocation,
  AllocationGroupWithAllocations,
  CategoryWithDesignation,
} from '@/lib/types';
import { handleError, isError } from '@/lib/utils';

import { Combobox } from '@/components/ui/combobox';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';

const schema = z.object({
  sourceId: z.string().min(1, 'Please select a source account'),
  destinationId: z.string().min(1, 'Please select a destination account'),
  amount: z.coerce
    .number<number>()
    .min(0.01, 'Must be at least $0.01')
    .multipleOf(0.01, 'Must contain at most 2 decimal places'),
});

type FormData = z.infer<typeof schema>;

function TransferFormFields({
  accountType,
  categories,
  allocationGroups,
  miscAllocations,
}: {
  accountType: 'category' | 'allocation';
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
}) {
  const form = useFormContext<FormData>();

  const getAccountData = (excludeId?: string) => {
    if (accountType === 'category') {
      return Object.entries(
        categories.reduce(
          (acc, category) => {
            if (excludeId && category.id === excludeId) return acc;
            const group = category.designationId;
            acc[group] = acc[group] || { items: [] };
            acc[group].items.push({
              value: category.id,
              label: `${category.name} (SC${category.code})`,
            });
            return acc;
          },
          {} as Record<string, { items: { value: string; label: string }[] }>,
        ),
      ).map(([designationId, group]) => ({
        heading:
          categories.find((c) => c.designationId === designationId)?.designation
            .name || designationId,
        ...group,
      }));
    } else {
      return [
        ...allocationGroups.map((group) => ({
          heading: group.name,
          items: group.allocations
            .filter((allocation) => !excludeId || allocation.id !== excludeId)
            .map((allocation) => ({
              value: allocation.id,
              label: allocation.name,
            })),
        })),
        ...(miscAllocations.length > 0
          ? [
              {
                heading: 'Miscellaneous',
                items: miscAllocations
                  .filter(
                    (allocation) => !excludeId || allocation.id !== excludeId,
                  )
                  .map((allocation) => ({
                    value: allocation.id,
                    label: allocation.name,
                  })),
              },
            ]
          : []),
      ];
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField
          control={form.control}
          name="sourceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Account</FormLabel>
              <FormControl>
                <Combobox data={getAccountData()} {...field} name="source" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="destinationId"
          render={({ field }) => {
            const sourceId = form.watch('sourceId');
            return (
              <FormItem>
                <FormLabel>To Account</FormLabel>
                <FormControl>
                  <Combobox
                    data={getAccountData(sourceId)}
                    {...field}
                    name="destination"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>

      <FormInput<FormData>
        name="amount"
        label="Amount"
        placeholder="$100.00"
        currency
      />
    </>
  );
}

export function TransferDialog({
  trigger,
  accountType,
  currentAccountId,
  categories,
  allocationGroups,
  miscAllocations,
}: {
  trigger: React.ReactNode;
  accountType: 'category' | 'allocation';
  currentAccountId: string;
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
}) {
  async function onSubmit(data: FormData): Promise<boolean> {
    const transferData = {
      fromCategoryId: accountType === 'category' ? data.sourceId : undefined,
      fromAllocationId:
        accountType === 'allocation' ? data.sourceId : undefined,
      toCategoryId: accountType === 'category' ? data.destinationId : undefined,
      toAllocationId:
        accountType === 'allocation' ? data.destinationId : undefined,
      amount: data.amount,
    };

    const result = await handleError(transferFunds(transferData), {
      toast: {
        loading: 'Transferring funds...',
        success: 'Funds transferred successfully',
        error: 'Failed to transfer funds',
      },
    });
    return !isError(result);
  }

  return (
    <FormDialog
      trigger={trigger}
      title="Transfer Funds"
      description="Transfer funds to another account of the same type."
      schema={schema}
      defaultValues={{
        sourceId: currentAccountId,
        destinationId: '',
        amount: 0,
      }}
      onSubmit={onSubmit}
    >
      <TransferFormFields
        accountType={accountType}
        categories={categories}
        allocationGroups={allocationGroups}
        miscAllocations={miscAllocations}
      />
    </FormDialog>
  );
}
