import { Metadata } from 'next';

import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';

import { getUsersWithPurchases } from '@/prisma/services/user';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
          <Card
            key={user.id}
            className="flex flex-row items-center justify-between py-2"
          >
            <p>
              {user.first} {user.last}
            </p>
            <p>
              $
              {user.purchases.reduce(
                (acc, purchase) => acc + purchase.amount,
                0,
              )}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <EllipsisVertical />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Pencil /> Edit User
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="text-inherit" />
                  Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        ))}
      </div>
    </div>
  );
}
