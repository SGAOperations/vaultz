import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function SectionHeader({ title, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between pt-6 pb-3">
      <h2 className="text-foreground text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
