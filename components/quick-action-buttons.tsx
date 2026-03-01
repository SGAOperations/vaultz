'use client';

import { useQuery } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';

import { getCategoriesByDesignation } from '@/prisma/services/category';
import { getUsers } from '@/prisma/services/user';

import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { Button } from '@/components/ui/button';
import { UserDialog } from '@/components/user-dialog';

interface QuickActionButtonsProps {
  designationId: string;
}

export function QuickActionButtons({ designationId }: QuickActionButtonsProps) {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-by-designation', designationId],
    queryFn: () => getCategoriesByDesignation({ designationId }),
  });

  return (
    <>
      <CreatePurchaseDialog users={users} categories={categories} />
      <UserDialog user={undefined}>
        <Button variant="outline" className="gap-2">
          <UserPlus className="size-4" />
          Add User
        </Button>
      </UserDialog>
    </>
  );
}
