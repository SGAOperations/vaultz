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
  sourceType: z.enum(['category', 'allocation']),
  sourceId: z.string().min(1, 'Please select a source'),
  destinationType: z.enum(['category', 'allocation']),
  destinationId: z.string().min(1, 'Please select a destination'),
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
        data.sourceType === 'category' ? data.sourceId : undefined,
      fromAllocationId:
        data.sourceType === 'allocation' ? data.sourceId : undefined,
      toCategoryId:
        data.destinationType === 'category' ? data.destinationId : undefined,
      toAllocationId:
        data.destinationType === 'allocation' ? data.destinationId : undefined,
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
      description="Transfer funds between categories and allocations."
      schema={schema}
      defaultValues={{
        sourceType: 'category' as const,
        sourceId: '',
        destinationType: 'category' as const,
        destinationId: '',
        amount: 0,
        description: '',
      }}
      onSubmit={onSubmit}
    >
      {(form) => (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">From</h3>
              <FormField
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type</FormLabel>
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
                        name="sourceType"
                        onChange={(value) => {
                          field.onChange(value);
                          form.setValue('sourceId', '');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sourceId"
                render={({ field }) => {
                  const sourceType = form.watch('sourceType');
                  const data =
                    sourceType === 'category'
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
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Combobox data={data} {...field} name="source" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">To</h3>
              <FormField
                control={form.control}
                name="destinationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Type</FormLabel>
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
                        name="destinationType"
                        onChange={(value) => {
                          field.onChange(value);
                          form.setValue('destinationId', '');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinationId"
                render={({ field }) => {
                  const destinationType = form.watch('destinationType');
                  const data =
                    destinationType === 'category'
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
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <Combobox data={data} {...field} name="destination" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
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
