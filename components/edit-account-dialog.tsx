'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { z } from 'zod/v4';

import { deleteAccount, updateAccount } from '@/prisma/services/account';

import { Account } from '@/lib/types';
import { handleError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
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
  code: z.string().length(4, 'Must be exactly 4 characters long'),
  name: z.string().min(1, 'Please enter an account name'),
  amount: z.coerce
    .number<number>()
    .min(0.01, 'Must be at least $0.01')
    .multipleOf(0.01, 'Must contain at most 2 decimal places'),
});

export function EditAccountDialog({
  account,
  trigger,
}: {
  account: Account;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: account.code,
      name: account.name,
      amount: account.amount,
    },
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    await handleError(updateAccount({ id: account.id, ...data }), {
      toast: {
        loading: 'Updating account...',
        success: 'Account updated successfully',
        error: 'Failed to update account',
      },
      onSuccess: () => {
        setOpen(false);
      },
    });
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    await handleError(deleteAccount(account.id), {
      toast: {
        loading: 'Deleting account...',
        success: 'Account deleted successfully',
        error: 'Failed to delete account',
      },
      onSuccess: () => {
        setOpen(false);
        // Navigate to the parent index page
        router.push(`/index/${account.indexId}`);
      },
    });
  }

  function handleCancel() {
    setConfirmDelete(false);
    form.reset();
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      setConfirmDelete(false);
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update the account details or delete it entirely.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Food" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="7XXX" {...field} />
                  </FormControl>
                  <FormDescription>
                    The spend category number to be associated with this
                    account.
                  </FormDescription>
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
                      value={field.value != null ? '$' + field.value : ''}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace('$', ''))
                      }
                    />
                  </FormControl>
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
      </DialogContent>
    </Dialog>
  );
}
