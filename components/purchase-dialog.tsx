'use client';

import { PurchaseWithUser } from '@/lib/types';

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
  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Purchase Information</DialogTitle>
          <DialogDescription>
            See all of the details relevant to this purchase.
          </DialogDescription>

          <div>
            <p>{purchase.id}</p>
            <p>
              {purchase.user.first} {purchase.user.last}
            </p>
            <DateTime date={purchase.timestamp} />
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
