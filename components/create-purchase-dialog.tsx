'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod/v4';

import { User } from '@/prisma/client';
import { createPurchase } from '@/prisma/services/purchase';

import { Account } from '@/lib/types';
import { UploadDropzone } from '@/lib/uploadthing';

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const schema = z.object({
  userId: z.string().min(1, 'Please select a user'),
  accountId: z.string().min(1, 'Please select an account'),
  description: z.string().optional(),
  amount: z.coerce
    .number<number>()
    .min(0.01, 'Must be at least $0.01')
    .multipleOf(0.01, 'Must contain at most 2 decimal places'),
  receipts: z.array(z.string()).optional(),
});

export function CreatePurchaseDialog({
  users,
  accounts,
  trigger,
}: {
  users: User[];
  accounts: Account[];
  trigger: React.ReactNode;
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
      receipts: [],
    },
  });

  function onSubmit(data: z.infer<typeof schema>) {
    createPurchase(data);
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

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
                      data={users.map((v) => ({
                        value: v.id,
                        label: `${v.first} ${v.last}`,
                      }))}
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
                      data={accounts.map((v) => ({
                        value: v.id,
                        label: `${v.name} (${v.code})`,
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
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
                  <FormLabel>Receipts</FormLabel>
                  <FormControl>
                    <UploadDropzone
                      endpoint="receipts"
                      config={{ mode: 'auto', cn: twMerge }}
                      onClientUploadComplete={(data) => {
                        if (data.length === 0) return;

                        field.onChange(data.map((d) => d.key));
                        setFilesUploaded((prev) => [
                          ...prev,
                          ...data.map((d) => d.name),
                        ]);
                      }}
                      onUploadError={(error) => {
                        console.error('Error uploading files', error.message);
                        alert(
                          'There was an error while uploading your files. Please try again later.',
                        );
                      }}
                    />
                  </FormControl>
                  {filesUploaded.length > 0 && (
                    <p>Uploaded: {filesUploaded.join(', ')}</p>
                  )}
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
