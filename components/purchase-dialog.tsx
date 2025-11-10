'use client';

import { useState } from 'react';

import { Pencil } from 'lucide-react';

import { User } from '@/prisma/client';

import {
  AccountWithIndex,
  Allocation,
  AllocationGroupWithAllocations,
  PurchaseWithUser,
} from '@/lib/types';
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
import { EditPurchaseDialog } from './edit-purchase-dialog';
import { Button } from './ui/button';

export function PurchaseDialog({
  trigger,
  purchase,
  users,
  accounts,
  allocationGroups,
  miscAllocations,
}: {
  trigger: React.ReactNode;
  purchase: PurchaseWithUser;
  users: User[];
  accounts: AccountWithIndex[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
}) {
  const receiptUrls = purchase.receipts.map((r) => getFileUrl(r));
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-1/3">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Purchase Information</DialogTitle>
              <Button
                onClick={() => {
                  setViewOpen(false);
                  setEditOpen(true);
                }}
                variant="ghost"
                size="icon"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
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
            <p>Description</p>
            <p className="text-muted-foreground">{purchase.description}</p>
            <p>Amount</p>
            <p className="text-muted-foreground">
              ${formatNumber(purchase.amount)}
            </p>
            <p>Receipts</p>
            <p className="text-muted-foreground flex gap-3">
              {receiptUrls.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  className="hover:underline"
                >
                  File {i + 1}
                </a>
              ))}
              {receiptUrls.length === 0 && 'N/A'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <EditPurchaseDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        purchase={purchase}
        users={users}
        accounts={accounts}
        allocationGroups={allocationGroups}
        miscAllocations={miscAllocations}
      />
    </>
  );
}
