'use client';

import { PurchaseWithUser } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { Card } from '@/components/ui/card';

import { PurchaseDialog } from './purchase-dialog';

export function PurchaseCard({ purchase }: { purchase: PurchaseWithUser }) {
  return (
    <PurchaseDialog
      trigger={
        <Card
          key={purchase.id}
          className="group-hover:bg-accent group-hover:border-muted hover:bg-accent grid cursor-pointer grid-cols-6 items-center overflow-hidden p-3"
        >
          <p>${formatNumber(purchase.amount)}</p>
          <p className="col-span-2 text-sm">
            {purchase.user.first} {purchase.user.last}
          </p>
          <p className="col-span-2 truncate text-sm">{purchase.description}</p>
          <p className="col-span-1 text-sm">
            {new Date(purchase.purchasedAt).toLocaleDateString()}
          </p>
        </Card>
      }
      purchase={purchase}
    />
  );
}
