import { Plus } from 'lucide-react';

import { getAllIndexes } from '@/prisma/services';
import { getAllAccounts } from '@/prisma/services/account';
import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getUsers } from '@/prisma/services/user';

import { CreateIndexDialog } from '@/components/create-index-dialog';
import { IndexCard } from '@/components/index-card';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const indexes = await getAllIndexes();
  const users = await getUsers();
  const accounts = await getAllAccounts();
  const allocationGroups = await getAllAllocationGroups();
  const miscAllocations = await getMiscAllocations();

  return (
    <div className="flex w-full flex-col gap-3">
      <h1 className="mt-4 text-3xl font-bold">Indexes</h1>
      <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
        {indexes.map((v, i) => (
          <IndexCard
          key={i}
          index={v}
          users={users}
          accounts={accounts}
          allocationGroups={allocationGroups}
          miscAllocations={miscAllocations}
        />
        ))}

        <CreateIndexDialog
          trigger={
            <Button>
              <Plus />
              Create Index
            </Button>
          }
        />
      </div>
    </div>
  );
}
