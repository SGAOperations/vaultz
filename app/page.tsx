import { Plus } from 'lucide-react';

import { getAllIndexes } from '@/prisma/services';

import { CreateIndexDialog } from '@/components/create-index-dialog';
import { EmptyState } from '@/components/empty-state';
import { IndexCard } from '@/components/index-card';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const indexes = await getAllIndexes();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Indexes"
        description="Manage your financial indexes and track all purchases"
        actions={
          <CreateIndexDialog
            trigger={
              <Button className="gap-2 shadow-sm">
                <Plus className="size-4" />
                Create Index
              </Button>
            }
          />
        }
      />

      {indexes.length === 0 ? (
        <EmptyState
          message="No indexes yet"
          description="Create your first index to start tracking purchases"
        />
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {indexes.map((v, i) => (
            <IndexCard key={i} index={v} />
          ))}
        </div>
      )}
    </div>
  );
}
