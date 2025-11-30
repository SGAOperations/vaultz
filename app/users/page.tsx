import { Metadata } from 'next';

import { DollarSign, Plus, User } from 'lucide-react';
import Link from 'next/link';

import { getUsersWithPurchases } from '@/prisma/services/user';

import { formatNumber } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserDialog } from '@/components/user-dialog';

import { UserDropdown } from './client';

export const metadata: Metadata = { title: 'User Overview' };

export default async function UserOverview() {
  const users = await getUsersWithPurchases();

  return (
    <div className="flex w-full flex-col gap-3">
      <h1 className="mt-4 text-3xl font-bold">Users</h1>
      {users.length === 0 && (
        <p className="text-muted-foreground">No users found.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {users.map((user) => (
          <Link key={user.id} href={`/users/${user.id}`}>
            <Card className="hover:bg-accent flex flex-row items-center justify-between py-2">
              <p>
                {user.first} {user.last}
              </p>
              <p>
                $
                {formatNumber(
                  user.purchases.reduce(
                    (acc, purchase) => acc + purchase.amount,
                    0,
                  ),
                )}
              </p>
              <UserDropdown user={user} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
