'use client';

<<<<<<< HEAD
import { User } from '@/prisma/client';

import {
  AccountWithIndex,
  Allocation,
  AllocationGroupWithAllocations,
  PurchaseWithUser,
} from '@/lib/types';
=======
import { Calendar, DollarSign, FileText, User } from 'lucide-react';

import { PurchaseWithUser } from '@/lib/types';
>>>>>>> 3381e3520766469b99412b04de4a4d5681e781ad
import { formatNumber } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { Card } from '@/components/ui/card';

import { PurchaseDialog } from './purchase-dialog';

export function PurchaseCard({
  purchase,
  users,
  accounts,
  allocationGroups,
  miscAllocations,
  stopPropagation = false,
}: {
  purchase: PurchaseWithUser;
  users: User[];
  accounts: AccountWithIndex[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
  stopPropagation?: boolean;
}) {
  return (
    <PurchaseDialog
      trigger={
        <Card
          key={purchase.id}
          className="hover:border-primary/20 hover:bg-accent/50 grid cursor-pointer grid-cols-12 items-center gap-2 overflow-hidden p-3 transition-all duration-150"
          onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        >
          <div className="col-span-3 flex items-center gap-2">
            <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <DollarSign className="text-primary size-4" />
            </div>
            <span className="font-semibold">
              ${formatNumber(purchase.amount)}
            </span>
          </div>

          <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
            <User className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground truncate text-sm">
              {purchase.user.first} {purchase.user.last}
            </span>
          </div>

          <div className="col-span-4 flex items-center gap-1.5 overflow-hidden">
            <FileText className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground truncate text-sm">
              {purchase.description || 'No description'}
            </span>
          </div>

          <div className="col-span-2 flex items-center justify-end gap-1.5">
            <Calendar className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground text-sm">
              <DateTime date={purchase.purchasedAt} dateOnly />
            </span>
          </div>
        </Card>
      }
      purchase={purchase}
      users={users}
      accounts={accounts}
      allocationGroups={allocationGroups}
      miscAllocations={miscAllocations}
    />
  );
}
