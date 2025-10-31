'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { createIndex } from '@/prisma/services';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const schema = z.object({
  name: z
    .string()
    .min(2, 'Must be at least 2 characters')
    .max(50, 'Cannot be longer than 50 characters'),
  code: z.string().length(6, 'Must be exactly 6 characters long'),
});

export function CreateIndexDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '' },
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    await handleToast(createIndex(data), {
      toasts: {
        loading: 'Creating index...',
        success: 'Index created successfully',
        error: 'Failed to create index',
      },
      onSuccess: () => {
        form.reset();
        setOpen(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Index</DialogTitle>
          <DialogDescription>
            An index contains multiple accounts that track purchases.
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
                    <Input placeholder="Budget Index" {...field} />
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
                    <Input placeholder="80XXXX" {...field} />
                  </FormControl>
                  <FormDescription>
                    The index number to be associated with this index.
                  </FormDescription>
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
