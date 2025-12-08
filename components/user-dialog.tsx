'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod/v4';

import { User } from '@/prisma/client';
import { createUser, updateUser } from '@/prisma/services/user';

import { handleError, isError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormInput } from '@/components/ui/form-input';

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

type FormData = z.infer<typeof schema>;

export function UserDialog({
  user,
  children,
}: {
  user?: User;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { first: user?.first || '', last: user?.last || '' },
  });
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: FormData) {
    if (user) {
      const result = await handleError(updateUser({ ...data, id: user.id }), {
        toast: {
          loading: 'Updating user...',
          success: 'User updated successfully',
          error: 'Failed to update user',
        },
      });
      if (!isError(result)) {
        setOpen(false);
      }
    } else {
      const result = await handleError(createUser(data), {
        toast: {
          loading: 'Creating user...',
          success: 'User created successfully',
          error: 'Failed to create user',
        },
      });
      if (!isError(result)) {
        form.reset();
        setOpen(false);
      }
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

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormInput<FormData>
              name="first"
              label="First Name"
              placeholder="John"
            />
            <FormInput<FormData>
              name="last"
              label="Last Name"
              placeholder="Travolta"
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Submit
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
