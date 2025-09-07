'use client';

import { PurchaseWithUser } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { Card } from '@/components/ui/card';

export function PurchaseCard({
  purchase: { id, amount, user, description, timestamp },
}: {
  purchase: PurchaseWithUser;
}) {
  return (
    <Card
      key={id}
      className="group-hover:bg-accent group-hover:border-muted grid grid-cols-6 items-center overflow-hidden p-3"
    >
      <p>${formatNumber(amount)}</p>
      <p className="col-span-2 text-sm">
        {user.first} {user.last}
      </p>
      <p className="col-span-2 truncate text-sm">{description}</p>
      <p className="col-span-1 text-sm">
        <DateTime date={timestamp} />
      </p>
    </Card>
  );
}
