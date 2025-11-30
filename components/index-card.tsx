import { CreditCard, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

import { IndexWithPurchases } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { LinkCard } from '@/components/link-card';

export function IndexCard({
  index: { id, name, code, purchases, amount },
}: {
  index: IndexWithPurchases;
}) {
  const spent =
    purchases.length === 0
      ? 0
      : purchases.map((v) => v.amount).reduce((p, c) => p + c);
  const remaining = amount - spent;

  return (
    <LinkCard
      href={`/index/${id}`}
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
      ]}
    />
  );
}
