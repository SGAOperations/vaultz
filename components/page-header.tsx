import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex w-full flex-col gap-1 pt-2 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="from-primary to-primary/70 bg-gradient-to-r bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
