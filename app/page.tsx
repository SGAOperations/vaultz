import { Plus } from 'lucide-react';

import { getAllIndexes } from '@/prisma/services';

import { CreateIndexDialog } from '@/components/create-index-dialog';
import { IndexCard } from '@/components/index-card';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const indexes = await getAllIndexes();

  return (
    <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
      {indexes.map((v, i) => (
        <IndexCard key={i} index={v} />
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
  );
}
