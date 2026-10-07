'use client';

import * as React from 'react';
import { FieldValues, Path, useFormContext } from 'react-hook-form';

import { cn } from '@/lib/utils';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

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

/**
 * Renders a form value as the text shown in a currency input when it is not
 * focused. Anything that is not a usable amount — unset, empty, unparseable
 * text such as `abc` or `1,234`, or the zero every amount field defaults to —
 * renders as an empty string so the field's placeholder stays visible instead
 * of a misleading `0.00` or a literal `NaN`.
 */
function formatCurrencyValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const parsed =
    typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed === 0) return '';
  return parsed.toFixed(2);
}

function FormInput<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  currency,
  prefix,
  numbersOnly,
  onFocus,
  onChange,
  onBlur,
  ...inputProps
}: FormInputProps<TFieldValues>) {
  const form = useFormContext<TFieldValues>();
  // `null` means "not being edited": the formatted form value is shown instead.
  const [editingValue, setEditingValue] = React.useState<string | null>(null);

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
                  value={editingValue ?? formatCurrencyValue(field.value)}
                  onFocus={(e) => {
                    setEditingValue(formatCurrencyValue(field.value));
                    onFocus?.(e);
                  }}
                  onChange={(e) => {
                    setEditingValue(e.target.value);
                    field.onChange(e.target.value);
                    onChange?.(e);
                  }}
                  onBlur={(e) => {
                    setEditingValue(null);
                    field.onBlur();
                    onBlur?.(e);
                  }}
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
                  onFocus={onFocus}
                  onChange={(e) => {
                    const value = numbersOnly
                      ? e.target.value.replace(/\D/g, '')
                      : e.target.value;
                    field.onChange(value);
                    onChange?.(e);
                  }}
                  onBlur={(e) => {
                    field.onBlur();
                    onBlur?.(e);
                  }}
                />
              </div>
            ) : (
              <Input
                {...inputProps}
                {...field}
                onFocus={onFocus}
                onChange={(e) => {
                  field.onChange(e);
                  onChange?.(e);
                }}
                onBlur={(e) => {
                  field.onBlur();
                  onBlur?.(e);
                }}
              />
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
