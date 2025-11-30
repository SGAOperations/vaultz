'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod/v4';

import { User } from '@/prisma/client';
import { deletePurchase, updatePurchase } from '@/prisma/services/purchase';

import {
  AccountWithIndex,
  Allocation,
  AllocationGroupWithAllocations,
  PurchaseWithUser,
} from '@/lib/types';
import { UploadDropzone } from '@/lib/uploadthing';
import { formatNumber, getFileUrl, handleError } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { DateTime } from './date-time';
import { Button } from './ui/button';
import { Combobox } from './ui/combobox';
import { DatePicker } from './ui/date-picker';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';

const schema = z.object({
  userId: z.string().min(1, 'Please select a user'),
  accountId: z.string().min(1, 'Please select an account'),
  allocationId: z.string().optional(),
  description: z.string().optional(),
  amount: z.coerce
    .number<number>()
    .min(0.01, 'Must be at least $0.01')
    .multipleOf(0.01, 'Must contain at most 2 decimal places'),
  purchasedAt: z.date('Please select a valid date'),
  receipts: z.array(z.string()).optional(),
});

export function PurchaseDialog({
  trigger,
  purchase,
  users,
  accounts,
  allocationGroups,
  miscAllocations,
}: {
  trigger: React.ReactNode;
  purchase: PurchaseWithUser;
  users: User[];
  accounts: AccountWithIndex[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
}) {
  const receiptUrls = purchase.receipts.map((r) => getFileUrl(r));
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filesUploaded, setFilesUploaded] = useState<string[]>([]);
  const [receiptsToDisplay, setReceiptsToDisplay] = useState<string[]>(
    purchase.receipts,
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: purchase.userId,
      accountId: purchase.accountId,
      allocationId: purchase.allocationId || '',
      description: purchase.description,
      amount: purchase.amount,
      purchasedAt: new Date(purchase.purchasedAt),
      receipts: purchase.receipts,
    },
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    await handleError(updatePurchase({ id: purchase.id, ...data }), {
      toast: {
        loading: 'Updating purchase...',
        success: 'Purchase updated successfully',
        error: 'Failed to update purchase',
      },
      onSuccess: () => {
        setIsEditing(false);
        setOpen(false);
      },
    });
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    await handleError(deletePurchase(purchase.id), {
      toast: {
        loading: 'Deleting purchase...',
        success: 'Purchase deleted successfully',
        error: 'Failed to delete purchase',
      },
      onSuccess: () => {
        setOpen(false);
      },
    });
  }

  function removeReceipt(receiptKey: string) {
    const currentReceipts = form.getValues('receipts') || [];
    form.setValue(
      'receipts',
      currentReceipts.filter((r) => r !== receiptKey),
    );
    setReceiptsToDisplay((prev) => prev.filter((r) => r !== receiptKey));
  }

  function handleCancel() {
    setIsEditing(false);
    setConfirmDelete(false);
    // Reset form to original values
    form.reset({
      userId: purchase.userId,
      accountId: purchase.accountId,
      allocationId: purchase.allocationId || '',
      description: purchase.description,
      amount: purchase.amount,
      purchasedAt: new Date(purchase.purchasedAt),
      receipts: purchase.receipts,
    });
    setReceiptsToDisplay(purchase.receipts);
    setFilesUploaded([]);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setIsEditing(false);
      setConfirmDelete(false);
      form.reset();
      setReceiptsToDisplay(purchase.receipts);
      setFilesUploaded([]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-2/3 sm:max-w-full">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Purchase' : 'Purchase Information'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details of this purchase or delete it entirely.'
              : 'See all of the details relevant to this purchase.'}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Combobox
                          data={[
                            {
                              items: users.map((v) => ({
                                value: v.id,
                                label: `${v.first} ${v.last}`,
                              })),
                            },
                          ]}
                          {...field}
                          name="user"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex gap-2">
                        <FormLabel>Description</FormLabel>
                        <FormDescription className="text-xs">
                          Optional
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account</FormLabel>
                      <FormControl>
                        <Combobox
                          data={Object.entries(
                            accounts.reduce(
                              (acc, account) => {
                                const group = account.indexId;
                                acc[group] = acc[group] || { items: [] };
                                acc[group].items.push({
                                  value: account.id,
                                  label: `${account.name} (${account.code})`,
                                });
                                return acc;
                              },
                              {} as Record<
                                string,
                                { items: { value: string; label: string }[] }
                              >,
                            ),
                          ).map(([indexId, group]) => ({
                            heading:
                              accounts.find((a) => a.indexId === indexId)?.index
                                .name || indexId,
                            ...group,
                          }))}
                          {...field}
                          name="account"
                          disabled={accounts.length === 1}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allocationId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex gap-2">
                        <FormLabel>Allocation</FormLabel>
                        <FormDescription className="text-xs">
                          Optional
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Combobox
                          data={[
                            ...allocationGroups.map((group) => ({
                              heading: group.name,
                              items: group.allocations.map((allocation) => ({
                                value: allocation.id,
                                label: allocation.name,
                              })),
                            })),
                            {
                              heading: 'Miscellaneous',
                              items: miscAllocations.map((allocation) => ({
                                value: allocation.id,
                                label: allocation.name,
                              })),
                            },
                          ]}
                          {...field}
                          value={field.value || ''}
                          name="allocation"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchasedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={new Date(field.value)}
                          onChange={(val: Date) => field.onChange(val)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="$21.45"
                          {...field}
                          value={field.value ? '$' + field.value : ''}
                          onChange={(e) =>
                            field.onChange(e.target.value.replace('$', ''))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="receipts"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex gap-2">
                      <FormLabel>Receipts</FormLabel>
                      <FormDescription className="text-xs">
                        Optional
                      </FormDescription>
                    </div>
                    <FormControl>
                      <div className="space-y-2">
                        {receiptsToDisplay.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {receiptsToDisplay.map((receiptKey, i) => (
                              <div
                                key={receiptKey}
                                className="bg-muted flex items-center gap-2 rounded px-2 py-1"
                              >
                                <a
                                  href={getFileUrl(receiptKey)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm hover:underline"
                                >
                                  File {i + 1}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => removeReceipt(receiptKey)}
                                  className="hover:bg-accent rounded p-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <UploadDropzone
                          endpoint="receipts"
                          config={{ mode: 'auto', cn: twMerge }}
                          className="border-accent m-0 border p-4"
                          onClientUploadComplete={(data) => {
                            if (data.length === 0) return;

                            const newReceipts = data.map((d) => d.key);
                            const currentReceipts = field.value || [];
                            field.onChange([
                              ...currentReceipts,
                              ...newReceipts,
                            ]);
                            setReceiptsToDisplay((prev) => [
                              ...prev,
                              ...newReceipts,
                            ]);
                            setFilesUploaded((prev) => [
                              ...prev,
                              ...data.map((d) => d.name),
                            ]);
                          }}
                          onUploadError={(error) => {
                            if (
                              error.message ===
                              'Invalid config: FileSizeMismatch'
                            ) {
                              toast.error(
                                'File upload failed. Please ensure your file is either an image smaller than 1MB or a PDF smaller than 512KB.',
                              );
                              return;
                            }
                            toast.error(
                              'There was an error uploading your file. Please contact an administrator for assistance.',
                            );
                          }}
                        />
                      </div>
                    </FormControl>
                    <div>
                      {filesUploaded.slice(0, 5).map((f, i) => (
                        <p className="text-muted-foreground text-sm" key={i}>
                          {f}
                        </p>
                      ))}
                      {filesUploaded.length > 5 && (
                        <p className="text-muted-foreground text-sm">
                          and {filesUploaded.length - 5} more...
                        </p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant={confirmDelete ? 'destructive' : 'outline'}
                  onClick={handleDelete}
                  className="flex-1"
                >
                  {confirmDelete ? (
                    'Confirm Delete'
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <p>Purchase ID</p>
              <p className="text-muted-foreground">{purchase.id}</p>
              <p>Created</p>
              <p className="text-muted-foreground">
                <DateTime date={purchase.createdAt} />
              </p>
              <p>Purchase Date</p>
              <p className="text-muted-foreground">
                <DateTime date={purchase.purchasedAt} dateOnly />
              </p>
              <p>Name</p>
              <p className="text-muted-foreground">
                {purchase.user.first} {purchase.user.last}
              </p>
              <p>Description</p>
              <p className="text-muted-foreground">{purchase.description}</p>
              <p>Amount</p>
              <p className="text-muted-foreground">
                ${formatNumber(purchase.amount)}
              </p>
              <p>Receipts</p>
              <p className="text-muted-foreground flex gap-3">
                {receiptUrls.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    className="hover:underline"
                  >
                    File {i + 1}
                  </a>
                ))}
                {receiptUrls.length === 0 && 'N/A'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(true)} className="flex-1">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
