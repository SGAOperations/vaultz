import * as React from 'react';

import { cn } from '@/lib/utils';

function Checkbox({
  className,
  checked,
  onChange,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'> & {
  checked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={cn(
        'border-input ring-offset-background focus-visible:ring-ring peer h-4 w-4 shrink-0 rounded-sm border shadow-sm transition-colors',
        'focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'checked:bg-primary checked:text-primary-foreground checked:border-primary',
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
