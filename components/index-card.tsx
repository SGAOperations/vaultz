import { CreditCard, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

import { User } from '@/prisma/client';

import {
  AccountWithIndex,
  Allocation,
  AllocationGroupWithAllocations,
  IndexWithPurchases,
} from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { LinkCard } from '@/components/link-card';

export function IndexCard({
<<<<<<< HEAD
  index: { id, name, code, purchases },
  users,
  accounts,
  allocationGroups,
  miscAllocations,
=======
  index: { id, name, code, purchases, amount },
>>>>>>> 3381e3520766469b99412b04de4a4d5681e781ad
}: {
  index: IndexWithPurchases;
  users: User[];
  accounts: AccountWithIndex[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
}) {
  const spent =
    purchases.length === 0
      ? 0
      : purchases.map((v) => v.amount).reduce((p, c) => p + c);
  const remaining = amount - spent;

<<<<<<< HEAD
        <div className="flex flex-col gap-3 px-6">
          {purchases.slice(0, 3).map((v) => (
            <PurchaseCard
              key={v.id}
              purchase={v}
              stopPropagation
              users={users}
              accounts={accounts}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
            />
          ))}
          {purchases.length === 0 && (
            <p className="text-muted-foreground text-center text-sm">
              No purchases in this index yet...
            </p>
          )}
        </div>
      </Card>
    </Link>
=======
  return (
    <LinkCard
      href={`/index/${id}`}
      icon={CreditCard}
      title={name}
      description={code}
      badges={[
        {
          icon: Wallet,
          iconColor: 'text-stat-total',
          label: 'Budget',
          value: `$${formatNumber(amount)}`,
        },
        {
          icon: TrendingDown,
          iconColor: 'text-stat-spent',
          label: 'Spent',
          value: `$${formatNumber(spent)}`,
        },
        {
          icon: TrendingUp,
          iconColor: 'text-stat-remaining',
          label: 'Left',
          value: `$${formatNumber(remaining)}`,
        },
      ]}
    />
>>>>>>> 3381e3520766469b99412b04de4a4d5681e781ad
  );
}
