'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createPurchase } from '@/prisma/services/purchase';
import { useState } from 'react';
import { Account, User } from '@/prisma/client';
import { Combobox } from '@/components/ui/combobox';

const schema = z.object({
  userId: z.string(),
  accountId: z.string(),
  description: z.string().optional(),
  amount: z.number().min(0.01, 'Must be at least $0.01'),
});

export function CreatePurchaseDialog({
  users,
  accounts,
}: {
  users: User[];
  accounts: Account[];
}) {
  const [open, setOpen] = useState<boolean>(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { userId: '', accountId: '', description: '', amount: 0 },
  });

  function onSubmit(data: z.infer<typeof schema>) {
    createPurchase(data);
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="md:col-span-3">
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
                        label: v.code,
                      }))}
                      {...field}
                      name="account"
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
            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
