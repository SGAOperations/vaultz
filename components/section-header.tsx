import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function SectionHeader({ title, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between pt-4 pb-2">
      <h2 className="text-foreground font-semibold tracking-tight">{title}</h2>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
