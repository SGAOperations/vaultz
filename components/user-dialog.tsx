'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { User } from '@/prisma/client';
import { createUser, updateUser } from '@/prisma/services/user';

import { handleToast } from '@/lib/utils';

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const schema = z.object({
  first: z
    .string()
    .min(2, 'Must be at least 2 characters')
    .max(50, 'Cannot be longer than 50 characters'),
  last: z
    .string()
    .min(2, 'Must be at least 2 characters')
    .max(50, 'Cannot be longer than 50 characters'),
});

export function UserDialog({
  user,
  children,
}: {
  user?: User;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { first: user?.first || '', last: user?.last || '' },
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    if (user) {
      // Update existing user
      await handleToast(updateUser({ ...data, id: user.id }), {
        toasts: {
          loading: 'Updating user...',
          success: 'User updated successfully',
          error: 'Failed to update user',
        },
        onSuccess: () => {
          setOpen(false);
        },
      });
    } else {
      // Create new user
      await handleToast(createUser(data), {
        toasts: {
          loading: 'Creating user...',
          success: 'User created successfully',
          error: 'Failed to create user',
        },
        onSuccess: () => {
          form.reset();
          setOpen(false);
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Create User'}</DialogTitle>
          <DialogDescription>
            A user is associated with purchases. It can represent an individual
            or an organization.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="first"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Travolta" {...field} />
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
