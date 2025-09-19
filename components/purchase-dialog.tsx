'use client';

import { PurchaseWithUser } from '@/lib/types';
import { formatNumber, getFileUrl } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { DateTime } from './date-time';

export function PurchaseDialog({
  trigger,
  purchase,
}: {
  trigger: React.ReactNode;
  purchase: PurchaseWithUser;
}) {
  const receiptUrls = purchase.receipts.map((r) => getFileUrl(r));

  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-1/3">
        <DialogHeader>
          <DialogTitle>Purchase Information</DialogTitle>
          <DialogDescription>
            See all of the details relevant to this purchase.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <p>Purchase ID</p>
          <p className="text-muted-foreground">{purchase.id}</p>
          <p>Date</p>
          <p className="text-muted-foreground">
            <DateTime date={purchase.timestamp} />
          </p>
          <p>Name</p>
          <p className="text-muted-foreground">
            {purchase.user.first} {purchase.user.last}
          </p>
          <p>Amount</p>
          <p className="text-muted-foreground">
            ${formatNumber(purchase.amount)}
          </p>
          <p>Receipts</p>
          <p className="text-muted-foreground flex gap-3">
            {receiptUrls.map((url, i) => (
              <a key={url} href={url} target="_blank" className="hover:underline">
                File {i}
              </a>
            ))}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
