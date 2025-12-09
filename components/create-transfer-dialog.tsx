'use client';

import { z } from 'zod/v4';

import { createTransfer } from '@/prisma/services/transfer';

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
  accountType: z.enum(['category', 'allocation']),
  sourceId: z.string().min(1, 'Please select a source account'),
  destinationId: z.string().min(1, 'Please select a destination account'),
  amount: z.coerce
    .number<number>()
    .min(0.01, 'Must be at least $0.01')
    .multipleOf(0.01, 'Must contain at most 2 decimal places'),
  description: z
    .string()
    .min(1, 'Please enter a description')
    .max(200, 'Description must be less than 200 characters'),
});

type FormData = z.infer<typeof schema>;

export function CreateTransferDialog({
  trigger,
  categories,
  allocationGroups,
  miscAllocations,
}: {
  trigger: React.ReactNode;
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
}) {
  async function onSubmit(data: FormData): Promise<boolean> {
    const transferData = {
      fromCategoryId:
        data.accountType === 'category' ? data.sourceId : undefined,
      fromAllocationId:
        data.accountType === 'allocation' ? data.sourceId : undefined,
      toCategoryId:
        data.accountType === 'category' ? data.destinationId : undefined,
      toAllocationId:
        data.accountType === 'allocation' ? data.destinationId : undefined,
      amount: data.amount,
      description: data.description,
    };

    const result = await handleError(createTransfer(transferData), {
      toast: {
        loading: 'Creating transfer...',
        success: 'Transfer created successfully',
        error: 'Failed to create transfer',
      },
    });
    return !isError(result);
  }

  return (
    <FormDialog
      trigger={trigger}
      title="Transfer Funds"
      description="Transfer funds between accounts of the same type."
      schema={schema}
      defaultValues={{
        accountType: 'category' as const,
        sourceId: '',
        destinationId: '',
        amount: 0,
        description: '',
      }}
      onSubmit={onSubmit}
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Type</FormLabel>
                <FormControl>
                  <Combobox
                    data={[
                      {
                        items: [
                          { value: 'category', label: 'Category' },
                          { value: 'allocation', label: 'Allocation' },
                        ],
                      },
                    ]}
                    {...field}
                    name="accountType"
                    onChange={(value) => {
                      field.onChange(value);
                      form.setValue('sourceId', '');
                      form.setValue('destinationId', '');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="sourceId"
              render={({ field }) => {
                const accountType = form.watch('accountType');
                const data =
                  accountType === 'category'
                    ? Object.entries(
                        categories.reduce(
                          (acc, category) => {
                            const group = category.designationId;
                            acc[group] = acc[group] || { items: [] };
                            acc[group].items.push({
                              value: category.id,
                              label: `${category.name} (SC${category.code})`,
                            });
                            return acc;
                          },
                          {} as Record<
                            string,
                            { items: { value: string; label: string }[] }
                          >,
                        ),
                      ).map(([designationId, group]) => ({
                        heading:
                          categories.find(
                            (c) => c.designationId === designationId,
                          )?.designation.name || designationId,
                        ...group,
                      }))
                    : [
                        ...allocationGroups.map((group) => ({
                          heading: group.name,
                          items: group.allocations.map((allocation) => ({
                            value: allocation.id,
                            label: allocation.name,
                          })),
                        })),
                        ...(miscAllocations.length > 0
                          ? [
                              {
                                heading: 'Miscellaneous',
                                items: miscAllocations.map((allocation) => ({
                                  value: allocation.id,
                                  label: allocation.name,
                                })),
                              },
                            ]
                          : []),
                      ];

                return (
                  <FormItem>
                    <FormLabel>Source Account</FormLabel>
                    <FormControl>
                      <Combobox data={data} {...field} name="source" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="destinationId"
              render={({ field }) => {
                const accountType = form.watch('accountType');
                const sourceId = form.watch('sourceId');
                const data =
                  accountType === 'category'
                    ? Object.entries(
                        categories.reduce(
                          (acc, category) => {
                            const group = category.designationId;
                            acc[group] = acc[group] || { items: [] };
                            // Filter out the source account from destination options
                            if (category.id !== sourceId) {
                              acc[group].items.push({
                                value: category.id,
                                label: `${category.name} (SC${category.code})`,
                              });
                            }
                            return acc;
                          },
                          {} as Record<
                            string,
                            { items: { value: string; label: string }[] }
                          >,
                        ),
                      ).map(([designationId, group]) => ({
                        heading:
                          categories.find(
                            (c) => c.designationId === designationId,
                          )?.designation.name || designationId,
                        ...group,
                      }))
                    : [
                        ...allocationGroups.map((group) => ({
                          heading: group.name,
                          items: group.allocations
                            .filter((allocation) => allocation.id !== sourceId)
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
                                    (allocation) => allocation.id !== sourceId,
                                  )
                                  .map((allocation) => ({
                                    value: allocation.id,
                                    label: allocation.name,
                                  })),
                              },
                            ]
                          : []),
                      ];

                return (
                  <FormItem>
                    <FormLabel>Destination Account</FormLabel>
                    <FormControl>
                      <Combobox data={data} {...field} name="destination" />
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
          <FormInput<FormData>
            name="description"
            label="Description"
            placeholder="Explain the reason for this transfer"
          />
        </>
      )}
    </FormDialog>
  );
}
