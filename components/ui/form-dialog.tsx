'use client';

import * as React from 'react';
import {
  DefaultValues,
  FieldValues,
  FormProvider,
  useForm,
} from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod/v4';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface FormDialogProps<
  TOutput extends FieldValues,
  TInput extends FieldValues = TOutput,
> {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  schema: z.ZodType<TOutput, TInput>;
  defaultValues: DefaultValues<TInput>;
  onSubmit: (data: TOutput) => Promise<boolean>;
  submitLabel?: string;
  children: React.ReactNode;
}

function FormDialog<
  TOutput extends FieldValues,
  TInput extends FieldValues = TOutput,
>({
  trigger,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  submitLabel = 'Submit',
  children,
}: FormDialogProps<TOutput, TInput>) {
  const [open, setOpen] = React.useState(false);

  const form = useForm({ resolver: zodResolver(schema), defaultValues });
  const isSubmitting = form.formState.isSubmitting;

  async function handleSubmit(data: TOutput) {
    const success = await onSubmit(data);
    if (success) {
      form.reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8"
          >
            {children}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

export { FormDialog };
export type { FormDialogProps };
