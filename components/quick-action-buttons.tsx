'use client';

import { UserPlus } from 'lucide-react';

import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { Button } from '@/components/ui/button';
import { UserDialog } from '@/components/user-dialog';

export function QuickActionButtons() {
  return (
    <>
      <CreatePurchaseDialog />
      <UserDialog user={undefined}>
        <Button variant="outline" className="gap-2">
          <UserPlus className="size-4" />
          Add User
        </Button>
      </UserDialog>
    </>
  );
}
