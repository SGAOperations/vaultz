'use client';

import { PurchaseWithUser } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { Card } from '@/components/ui/card';

import { PurchaseDialog } from './purchase-dialog';

export function PurchaseCard({
  purchase,
  stopPropagation = false,
}: {
  purchase: PurchaseWithUser;
  stopPropagation?: boolean;
}) {
  return (
    <PurchaseDialog
      trigger={
        <Card
          key={purchase.id}
          className="group-hover:bg-accent group-hover:border-muted hover:bg-accent grid cursor-pointer grid-cols-6 items-center overflow-hidden p-3"
          onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        >
          <p>${formatNumber(purchase.amount)}</p>
          <p className="col-span-2 text-sm">
            {purchase.user.first} {purchase.user.last}
          </p>
          <p className="col-span-2 truncate text-sm">{purchase.description}</p>
          <p className="col-span-1 text-sm">
            <DateTime date={purchase.timestamp} />
          </p>
        </Card>
      }
      purchase={purchase}
    />
  );
}
