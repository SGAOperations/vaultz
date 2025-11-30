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
  currency?: boolean;
}

function FormInput<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  currency,
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
            {currency ? (
              <Input
                {...inputProps}
                {...field}
                value={field.value ? '$' + field.value : ''}
                onChange={(e) =>
                  field.onChange(e.target.value.replace(/^\$/, ''))
                }
              />
            ) : (
              <Input {...inputProps} {...field} />
            )}
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
