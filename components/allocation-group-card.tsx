import Link from 'next/link';

import { AllocationGroupWithAllocations } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import {
  Card,
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

  return (
    <Link href={`/index/${id}`}>
      <Card className="group hover:bg-accent h-full">
        <CardHeader>
          <CardTitle>{name}</CardTitle>
          <CardDescription>
            Allocated: $
            {allocations.length == 0
              ? 0
              : formatNumber(
                  allocations.map((v) => v.amount).reduce((p, c) => p + c),
                )}{' '}
            in {allocations.length} allocations
          </CardDescription>
          <CardDescription>
            Spent: $
            {purchases.length == 0
              ? 0
              : formatNumber(
                  allocations.map((v) => v.amount).reduce((p, c) => p + c),
                )}{' '}
            for {purchases.length} purchases
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
