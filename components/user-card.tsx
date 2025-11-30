import { Receipt, TrendingDown, User } from 'lucide-react';

import { UserWithPurchases } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { LinkCard } from '@/components/link-card';

export function UserCard({ user }: { user: UserWithPurchases }) {
  const totalSpent = user.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  return (
    <LinkCard
      href={`/users/${user.id}`}
      icon={User}
      title={`${user.first} ${user.last}`}
      badges={[
        {
          icon: TrendingDown,
          iconColor: 'text-stat-spent',
          label: 'Spent',
          value: `$${formatNumber(totalSpent)}`,
        },
        {
          icon: Receipt,
          iconColor: 'text-muted-foreground',
          label: 'Purchases',
          value: `${user.purchases.length}`,
        },
      ]}
    />
  );
}
