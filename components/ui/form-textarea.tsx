'use client';

import * as React from 'react';
import { FieldValues, Path, useFormContext } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

interface FormTextareaProps<TFieldValues extends FieldValues> extends Omit<
  React.ComponentProps<'textarea'>,
  'name'
> {
  name: Path<TFieldValues>;
  label: string;
  description?: string;
}

function FormTextarea<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  ...textareaProps
}: FormTextareaProps<TFieldValues>) {
  const form = useFormContext<TFieldValues>();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea {...textareaProps} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export { FormTextarea };
export type { FormTextareaProps };
