import { Layers, Percent, TrendingDown, Wallet } from 'lucide-react';

import { AllocationGroupWithAllocations } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { LinkCard } from '@/components/link-card';

export function AllocationGroupCard({
  allocationGroup: { id, name, allocations },
}: {
  allocationGroup: AllocationGroupWithAllocations;
}) {
  const purchases = allocations.flatMap((v) => v.purchases);
  const totalAllocated =
    allocations.length === 0
      ? 0
      : allocations.map((v) => v.amount).reduce((p, c) => p + c);
  const totalSpent =
    purchases.length === 0
      ? 0
      : purchases.map((v) => v.amount).reduce((p, c) => p + c);
  const percentSpent =
    totalAllocated === 0 ? 0 : (totalSpent / totalAllocated) * 100;

  return (
    <LinkCard
      href={`/allocation-groups/${id}`}
      icon={Layers}
      title={name}
      description={`${allocations.length} allocation${allocations.length !== 1 ? 's' : ''}`}
      badges={[
        {
          icon: Wallet,
          iconColor: 'text-stat-total',
          label: 'Allocated',
          value: `$${formatNumber(totalAllocated)}`,
        },
        {
          icon: TrendingDown,
          iconColor: 'text-stat-spent',
          label: 'Spent',
          value: `$${formatNumber(totalSpent)}`,
        },
        {
          icon: Percent,
          iconColor: 'text-stat-remaining',
          label: '% Spent',
          value: `${formatNumber(percentSpent)}%`,
        },
      ]}
    />
  );
}
