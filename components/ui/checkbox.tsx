import * as React from 'react';

import { cn } from '@/lib/utils';

function Checkbox({
  className,
  ...props
}: React.ComponentProps<'input'> & { type?: never }) {
  return (
    <input
      type="checkbox"
      className={cn(
        'border-input ring-offset-background focus-visible:ring-ring peer h-4 w-4 shrink-0 rounded-sm border shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'checked:bg-primary checked:text-primary-foreground checked:border-primary',
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
