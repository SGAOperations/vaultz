import { FileText, ListChecks, ShoppingCart, Trash2 } from 'lucide-react';

import { ProcessTemplateWithStepCount } from '@/lib/types';

import { LinkCard } from '@/components/link-card';

export function ProcessTemplateCard({
  template,
}: {
  template: ProcessTemplateWithStepCount;
}) {
  const stepCount = template.steps;
  const isDeleted = template.deletedAt !== null;

  return (
    <LinkCard
      href={`/processes/${template.id}`}
      icon={FileText}
      title={template.name}
      description={template.description ?? undefined}
      badges={[
        {
          icon: ListChecks,
          iconColor: 'text-info',
          label: 'Steps',
          value: stepCount.toString(),
        },
        {
          icon: ShoppingCart,
          iconColor: 'text-muted-foreground',
          label: 'Purchases',
          value: template.purchaseCount.toString(),
        },
        ...(isDeleted
          ? [
              {
                icon: Trash2,
                iconColor: 'text-destructive',
                label: 'Status',
                value: 'Deleted',
                valueColor: 'text-destructive',
              },
            ]
          : []),
      ]}
    />
  );
}
