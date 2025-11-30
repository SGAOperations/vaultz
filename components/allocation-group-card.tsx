import Link from 'next/link';

import { ChevronRight, Layers, TrendingDown, Wallet } from 'lucide-react';

import { AllocationGroupWithAllocations } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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

  return (
    <Link href={`/allocation-groups/${id}`} className="group">
      <Card className="hover:border-primary/30 h-full transition-all duration-200 hover:shadow-md gap-2">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                <Layers className="text-primary size-5" />
              </div>
              <div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  {name}
                </CardTitle>
                <CardDescription>
                  {allocations.length} allocation
                  {allocations.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
            <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
              <Wallet className="text-stat-total size-4" />
              <span className="text-sm">
                <span className="text-muted-foreground">Allocated:</span>{' '}
                <span className="font-semibold">
                  ${formatNumber(totalAllocated)}
                </span>
              </span>
            </div>
            <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
              <TrendingDown className="text-stat-spent size-4" />
              <span className="text-sm">
                <span className="text-muted-foreground">Spent:</span>{' '}
                <span className="font-semibold">
                  ${formatNumber(totalSpent)}
                </span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
