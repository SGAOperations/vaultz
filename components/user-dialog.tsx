'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod/v4';

import { User } from '@/prisma/client';
import { createUser, updateUser } from '@/prisma/services/user';

import { isError } from '@/lib/utils/toast';

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
      await toast.promise(updateUser({ ...data, id: user.id }), {
        loading: 'Updating user...',
        success: (result) => {
          if (isError(result)) {
            throw new Error('Failed to update user');
          }
          setOpen(false);
          return 'User updated successfully';
        },
        error: 'Failed to update user',
      });
    } else {
      // Create new user
      await toast.promise(createUser(data), {
        loading: 'Creating user...',
        success: (result) => {
          if (isError(result)) {
            throw new Error('Failed to create user');
          }
          form.reset();
          setOpen(false);
          return 'User created successfully';
        },
        error: 'Failed to create user',
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
