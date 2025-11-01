'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod/v4';

import { User } from '@/prisma/client';
import { createPurchase } from '@/prisma/services/purchase';

import {
  AccountWithIndex,
  Allocation,
  AllocationGroupWithAllocations,
} from '@/lib/types';
import { UploadDropzone } from '@/lib/uploadthing';
import { handleError } from '@/lib/utils';

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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const schema = z.object({
  userId: z.string().min(1, 'Please select a user'),
  accountId: z.string().min(1, 'Please select an account'),
  allocationId: z.string().optional(),
  description: z.string().optional(),
  amount: z.coerce
    .number<number>()
    .min(0.01, 'Must be at least $0.01')
    .multipleOf(0.01, 'Must contain at most 2 decimal places'),
  purchasedAt: z.string().min(1, 'Please select a date'),
  receipts: z.array(z.string()).optional(),
});

export function CreatePurchaseDialog({
  users,
  accounts,
  allocationGroups = [],
  miscAllocations = [],
}: {
  users: User[];
  accounts: AccountWithIndex[];
  allocationGroups?: AllocationGroupWithAllocations[];
  miscAllocations?: Allocation[];
}) {
  const [open, setOpen] = useState<boolean>(false);
  const [filesUploaded, setFilesUploaded] = useState<string[]>([]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: '',
      accountId: accounts.length == 1 ? accounts[0].id : '',
      description: '',
      amount: 0,
      purchasedAt: new Date().toISOString().split('T')[0],
      receipts: [],
    },
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    await handleError(createPurchase(data), {
      toast: {
        loading: 'Creating purchase...',
        success: 'Purchase created successfully',
        error: 'Failed to create purchase',
      },
      onSuccess: () => {
        form.reset();
        setOpen(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1">
          <Plus />
          Create Purchase
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Purchase</DialogTitle>
          <DialogDescription>
            All purchases by the same individual should be attached to the same
            name.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                      disabled={accounts.length === 1}
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
              name="purchasedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                    <UploadDropzone
                      endpoint="receipts"
                      config={{ mode: 'auto', cn: twMerge }}
                      className="border-accent m-0 border-1 p-4"
                      onClientUploadComplete={(data) => {
                        if (data.length === 0) return;

                        field.onChange(data.map((d) => d.key));
                        setFilesUploaded((prev) => [
                          ...prev,
                          ...data.map((d) => d.name),
                        ]);
                      }}
                      onUploadError={(error) => {
                        if (
                          error.message === 'Invalid config: FileSizeMismatch'
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

            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
