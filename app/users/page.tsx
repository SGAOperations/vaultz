import { Metadata } from 'next';

import { getUsers } from '@/prisma/services/user';

import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'User Overview' };

export default async function UserOverview() {
  const users = await getUsers();

  return (
    <div className="flex w-full flex-col gap-3">
      <h1 className="mt-4 text-3xl font-bold">Users</h1>
      {users.length === 0 && (
        <p className="text-muted-foreground">No users found.</p>
      )}

      <div className="flex flex-col gap-3">
        {users.map((user) => (
          <Card key={user.id} className="flex flex-row justify-between py-3">
            <p>
              {user.first} {user.last}
            </p>
            <p>$1</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
