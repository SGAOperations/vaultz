import { ReactNode } from 'react';

import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ message, description, action }: EmptyStateProps) {
  return (
    <div className="bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12">
      <div className="bg-muted rounded-full p-3">
        <Inbox className="text-muted-foreground size-6" />
      </div>
      <div className="text-center">
        <p className="text-muted-foreground font-medium">{message}</p>
        {description && (
          <p className="text-muted-foreground/70 mt-1 text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
