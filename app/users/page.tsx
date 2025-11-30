import { Metadata } from 'next';

import { DollarSign, User } from 'lucide-react';

import { getUsersWithPurchases } from '@/prisma/services/user';

import { formatNumber } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

import { UserDropdown } from './client';

export const metadata: Metadata = { title: 'User Overview' };

export default async function UserOverview() {
  const users = await getUsersWithPurchases();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Users"
        description="Manage team members and track their spending"
      />

      {users.length === 0 ? (
        <EmptyState
          message="No users found"
          description="Add users to start tracking their purchases"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {users.map((user) => {
            const totalSpent = user.purchases.reduce(
              (acc, purchase) => acc + purchase.amount,
              0,
            );
            return (
              <Card
                key={user.id}
                className="hover:border-primary/20 flex flex-row items-center gap-4 p-4 transition-all duration-150"
              >
                <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-full">
                  <User className="text-primary size-6" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-semibold">
                    {user.first} {user.last}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {user.purchases.length} purchase
                    {user.purchases.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="text-muted-foreground size-4" />
                  <span className="font-semibold">
                    {formatNumber(totalSpent)}
                  </span>
                </div>
                <UserDropdown user={user} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
