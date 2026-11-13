'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import {
  createPurchaseRequest,
  getRequestBudget,
  updatePurchaseRequest,
} from '@/prisma/services/purchase-request';

import {
  AllocationBudget,
  PurchaseRequestInput,
  purchaseRequestInputSchema,
} from '@/lib/purchase-request';
import { PurchaseRequestDetail, RequestFormOptions } from '@/lib/types';
import { UploadDropzone } from '@/lib/uploadthing';
import { getFileUrl, handleError, isError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormInput } from '@/components/ui/form-input';
import { FormTextarea } from '@/components/ui/form-textarea';
import { Label } from '@/components/ui/label';

import { BudgetPanel } from './budget-panel';

interface RequestDialogProps {
  options: RequestFormOptions;
  request?: PurchaseRequestDetail;
}

function defaultsFor(request?: PurchaseRequestDetail): PurchaseRequestInput {
  return {
    description: request?.description ?? '',
    amount: request?.amount ?? 0,
    allocationId: request?.allocation.id ?? '',
    categoryId: request?.category.id ?? '',
    purchaserId: request?.purchaser.id ?? '',
    notes: request?.notes ?? '',
    attachments: request?.attachments ?? [],
  };
}

// Renders its own trigger: Radix's asChild drops trigger elements passed in
// from a server component before their client chunk has loaded.
export function RequestDialog({ options, request }: RequestDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [divisionId, setDivisionId] = useState(
    () =>
      options.divisions.find((d) =>
        d.allocations.some((a) => a.id === request?.allocation.id),
      )?.id ?? (options.divisions.length === 1 ? options.divisions[0].id : ''),
  );
  const [budget, setBudget] = useState<AllocationBudget | null>(null);

  const form = useForm({
    resolver: zodResolver(purchaseRequestInputSchema),
    defaultValues: defaultsFor(request),
  });
  const isSubmitting = form.formState.isSubmitting;
  const [allocationId, amount] = useWatch({
    control: form.control,
    name: ['allocationId', 'amount'],
  });

  const division = useMemo(
    () => options.divisions.find((d) => d.id === divisionId),
    [options.divisions, divisionId],
  );

  useEffect(() => {
    if (!open || !allocationId) return;
    let cancelled = false;
    getRequestBudget({ allocationId, excludeRequestId: request?.id }).then(
      (result) => {
        if (!cancelled) setBudget(isError(result) ? null : result);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, allocationId, request?.id]);

  function changeDivision(id: string) {
    setDivisionId(id);
    form.setValue('allocationId', '');
    form.setValue('categoryId', '');
    setBudget(null);
  }

  async function onSubmit(data: PurchaseRequestInput) {
    const result = await handleError(
      request
        ? updatePurchaseRequest(request.id, data)
        : createPurchaseRequest(data),
      {
        toast: {
          loading: request ? 'Saving request...' : 'Submitting request...',
          success: request ? 'Request updated' : 'Request submitted',
          error: 'Failed to save the request',
        },
      },
    );
    if (isError(result)) return;

    setOpen(false);
    if (request) router.refresh();
    else {
      form.reset(defaultsFor());
      router.push(`/requests/${result.id}`);
    }
  }

  const noDivisions = options.divisions.length === 0;
  const noPurchasers = options.purchasers.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {request ? (
          <Button variant="outline">
            <Pencil />
            Edit
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="size-4" />
            New Request
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {request ? 'Edit Purchase Request' : 'New Purchase Request'}
          </DialogTitle>
          <DialogDescription>
            {options.year
              ? `Requests are charged to an allocation in ${options.year.name}. Your E-Board purchaser approves it first, then the Comptroller reviews it.`
              : 'There is no active fiscal year, so requests cannot be submitted right now.'}
          </DialogDescription>
        </DialogHeader>

        {noDivisions ? (
          <p className="text-muted-foreground text-sm">
            No divisions with allocations this year are mapped to your position.
            Ask the Vice President of Operational Affairs to give your position
            access to a division.
          </p>
        ) : (
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Division</Label>
                  <Combobox
                    name="division"
                    value={divisionId}
                    onChange={changeDivision}
                    data={[
                      {
                        items: options.divisions.map((d) => ({
                          label: `${d.name} (${d.designationLabel})`,
                          value: d.id,
                        })),
                      },
                    ]}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="allocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allocation</FormLabel>
                      <FormControl>
                        <Combobox
                          name="allocation"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={!division}
                          data={[
                            {
                              items: (division?.allocations ?? []).map((a) => ({
                                label: `${a.name} · ${a.periodName}`,
                                value: a.id,
                              })),
                            },
                          ]}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Combobox
                          name="category"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={!division}
                          data={[
                            {
                              items: (division?.categories ?? []).map((c) => ({
                                label: `${c.code} · ${c.name}`,
                                value: c.id,
                              })),
                            },
                          ]}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchaserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Board purchaser</FormLabel>
                      <FormControl>
                        <Combobox
                          name="purchaser"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={noPurchasers}
                          data={[
                            {
                              items: options.purchasers.map((p) => ({
                                label: `${p.first} ${p.last}`,
                                value: p.id,
                              })),
                            },
                          ]}
                        />
                      </FormControl>
                      {noPurchasers && (
                        <p className="text-muted-foreground text-xs">
                          No E-Board purchasers are set up yet.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <FormInput<PurchaseRequestInput>
                  name="description"
                  label="Description"
                  placeholder="Banners for the fall involvement fair"
                />
                <FormInput<PurchaseRequestInput>
                  name="amount"
                  label="Amount"
                  placeholder="120.00"
                  currency
                />
              </div>

              {budget && (
                <BudgetPanel budget={budget} amount={Number(amount) || 0} />
              )}

              <FormTextarea<PurchaseRequestInput>
                name="notes"
                label="Justification"
                description="Optional. What it's for, vendor, links."
                rows={3}
                className="resize-none"
              />

              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quotes and attachments</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2">
                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {field.value.map((key, i) => (
                              <div
                                key={key}
                                className="bg-muted flex items-center gap-2 rounded px-2 py-1"
                              >
                                <a
                                  href={getFileUrl(key)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm hover:underline"
                                >
                                  File {i + 1}
                                </a>
                                <button
                                  type="button"
                                  aria-label={`Remove file ${i + 1}`}
                                  onClick={() =>
                                    field.onChange(
                                      field.value.filter((k) => k !== key),
                                    )
                                  }
                                  className="hover:bg-accent rounded p-1"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <UploadDropzone
                          endpoint="requestAttachments"
                          config={{ mode: 'auto', cn: twMerge }}
                          className="border-accent m-0 border p-4"
                          onClientUploadComplete={(data) => {
                            if (data.length === 0) return;
                            field.onChange([
                              ...field.value,
                              ...data.map((d) => d.key),
                            ]);
                          }}
                          onUploadError={() => {
                            toast.error(
                              'Upload failed. Use an image under 1MB or a PDF under 512KB.',
                            );
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting || !options.year || noPurchasers}
                className="self-start"
              >
                {isSubmitting && <Loader2 className="animate-spin" />}
                {request ? 'Save changes' : 'Submit request'}
              </Button>
            </form>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
