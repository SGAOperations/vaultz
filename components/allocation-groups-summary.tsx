import { AllocationGroupWithAllocations } from '@/lib/types';

import { StatCards } from '@/components/stat-card';
import { UsageBar } from '@/components/usage-bar';

interface AllocationGroupsSummaryProps {
  allocationGroups: AllocationGroupWithAllocations[];
}

export function AllocationGroupsSummary({
  allocationGroups,
}: AllocationGroupsSummaryProps) {
  const allAllocations = allocationGroups.flatMap((g) => g.allocations);
  const allPurchases = allAllocations.flatMap((a) => a.purchases);

  const totalAllocated = allAllocations.reduce((acc, a) => acc + a.amount, 0);
  const totalSpent = allPurchases
    .filter((p) => !p.excludeFromTotal)
    .reduce((acc, p) => acc + p.amount, 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div className="mb-2 flex flex-col gap-3">
      <StatCards
        total={totalAllocated}
        spent={totalSpent}
        remaining={totalRemaining}
      />
      <UsageBar total={totalAllocated} spent={totalSpent} />
    </div>
  );
}
