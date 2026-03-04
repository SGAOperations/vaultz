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
import { cn } from '@/lib/utils';

interface FormInputProps<TFieldValues extends FieldValues> extends Omit<
  React.ComponentProps<'input'>,
  'name'
> {
  name: Path<TFieldValues>;
  label: string;
  description?: string;
  currency?: boolean;
  prefix?: string;
  numbersOnly?: boolean;
}

function FormInput<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  currency,
  prefix,
  numbersOnly,
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
              <div className="flex items-center">
                <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-l-md border border-r-0 px-3 text-sm">
                  $
                </span>
                <Input
                  {...inputProps}
                  {...field}
                  className={cn('rounded-l-none', inputProps.className)}
                />
              </div>
            ) : prefix ? (
              <div className="flex items-center">
                <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-l-md border border-r-0 px-3 text-sm">
                  {prefix}
                </span>
                <Input
                  {...inputProps}
                  {...field}
                  className={cn('rounded-l-none', inputProps.className)}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (numbersOnly) {
                      value = value.replace(/\D/g, '');
                    }
                    field.onChange(value);
                  }}
                />
              </div>
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
