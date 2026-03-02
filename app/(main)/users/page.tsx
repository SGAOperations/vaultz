import { Metadata } from 'next';

import { Plus } from 'lucide-react';

import { getUsersWithPurchases } from '@/prisma/services/user';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { UserCard } from '@/components/user-card';
import { UserDialog } from '@/components/user-dialog';

export const metadata: Metadata = { title: 'User Overview' };

export default async function UserOverview() {
  const users = await getUsersWithPurchases();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Users"
        description="Manage team members and track their spending"
        actions={
          <UserDialog user={undefined}>
            <Button className="gap-2">
              <Plus className="size-4" />
              Add User
            </Button>
          </UserDialog>
        }
      />

      {users.length === 0 ? (
        <EmptyState
          message="No users found"
          description="Add users to start tracking their purchases"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {users.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
