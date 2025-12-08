import * as React from 'react';

import { cn } from '@/lib/utils';

function Checkbox({
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'border-input ring-offset-background focus-visible:ring-ring h-4 w-4 shrink-0 rounded-sm border shadow-sm transition-colors',
        'focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'accent-primary',
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
