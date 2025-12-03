import { CreditCard, Percent, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

import { DesignationWithPurchases } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { LinkCard } from '@/components/link-card';

export function DesignationCard({
  designation: { id, name, code, purchases, amount },
}: {
  designation: DesignationWithPurchases;
}) {
  const spent =
    purchases.length === 0
      ? 0
      : purchases.map((v) => v.amount).reduce((p, c) => p + c);
  const remaining = amount - spent;
  const percentRemaining = amount === 0 ? 0 : (remaining / amount) * 100;

  return (
    <LinkCard
      href={`/designation/${id}`}
      icon={CreditCard}
      title={name}
      description={code}
      badges={[
        {
          icon: Wallet,
          iconColor: 'text-stat-total',
          label: 'Budget',
          value: `$${formatNumber(amount)}`,
        },
        {
          icon: TrendingDown,
          iconColor: 'text-stat-spent',
          label: 'Spent',
          value: `$${formatNumber(spent)}`,
        },
        {
          icon: TrendingUp,
          iconColor: 'text-stat-remaining',
          label: 'Left',
          value: `$${formatNumber(remaining)}`,
        },
        {
          icon: Percent,
          iconColor: 'text-info',
          label: 'Left',
          value: `${formatNumber(percentRemaining)}%`,
        },
      ]}
    />
  );
}
