'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod/v4';

import { verifyAccessCode } from '@/lib/actions/access';

import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';

const schema = z.object({
  passphrase: z.string().min(1, 'Passphrase is required'),
});

type FormData = z.infer<typeof schema>;

export function AccessForm({ from }: { from: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { passphrase: '' },
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const result = await verifyAccessCode({ ...data, from });
      if (result?.error) {
        form.setError('passphrase', { message: result.error });
        form.resetField('passphrase');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormInput<FormData>
          name="passphrase"
          label="Passphrase"
          type="password"
          autoFocus
          placeholder="Enter passphrase"
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Enter
        </Button>
      </form>
    </FormProvider>
  );
}
