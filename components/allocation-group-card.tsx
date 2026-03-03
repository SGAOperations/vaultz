import {
  Layers,
  Percent,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

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
  const totalRemaining = totalAllocated - totalSpent;
  const percentRemaining =
    totalAllocated === 0 ? 0 : (totalRemaining / totalAllocated) * 100;

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
          icon: TrendingUp,
          iconColor: 'text-stat-remaining',
          label: 'Left',
          value: `$${formatNumber(totalRemaining)}`,
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
