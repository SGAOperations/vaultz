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
import { Input } from '@/components/ui/input';

interface FormInputProps<TFieldValues extends FieldValues>
  extends Omit<React.ComponentProps<'input'>, 'name'> {
  name: Path<TFieldValues>;
  label: string;
  description?: string;
}

function FormInput<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  ...inputProps
}: FormInputProps<TFieldValues>) {
  const form = useFormContext<TFieldValues>();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...inputProps} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export { FormInput };
export type { FormInputProps };
