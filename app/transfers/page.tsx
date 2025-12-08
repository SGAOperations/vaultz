import { ArrowRight, Plus } from 'lucide-react';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getAllCategories } from '@/prisma/services/category';
import { getAllTransfers } from '@/prisma/services/transfer';

import { formatCurrency } from '@/lib/utils';

import { CreateTransferDialog } from '@/components/create-transfer-dialog';
import { DateTime } from '@/components/date-time';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default async function TransfersPage() {
  const [transfers, categories, allocationGroups, miscAllocations] =
    await Promise.all([
      getAllTransfers(),
      getAllCategories(),
      getAllAllocationGroups(),
      getMiscAllocations(),
    ]);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Transfers"
        description="View and manage fund transfers between accounts"
        actions={
          <CreateTransferDialog
            trigger={
              <Button>
                <Plus />
                New Transfer
              </Button>
            }
            categories={categories}
            allocationGroups={allocationGroups}
            miscAllocations={miscAllocations}
          />
        }
      />

      {transfers.length === 0 ? (
        <EmptyState
          message="No transfers yet"
          description="Create your first transfer to move funds between accounts"
        />
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer) => {
            const fromName = transfer.fromCategory
              ? transfer.fromCategory.name
              : transfer.fromAllocation?.name;
            const toName = transfer.toCategory
              ? transfer.toCategory.name
              : transfer.toAllocation?.name;
            const fromType = transfer.fromCategory ? 'Category' : 'Allocation';
            const toType = transfer.toCategory ? 'Category' : 'Allocation';

            return (
              <Card key={transfer.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="bg-muted rounded-md px-2 py-1">
                            <p className="text-muted-foreground text-xs">
                              {fromType}
                            </p>
                            <p className="font-semibold">{fromName}</p>
                          </div>
                          <ArrowRight className="text-muted-foreground size-5" />
                          <div className="bg-muted rounded-md px-2 py-1">
                            <p className="text-muted-foreground text-xs">
                              {toType}
                            </p>
                            <p className="font-semibold">{toName}</p>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {transfer.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-primary text-xl font-bold">
                      {formatCurrency(transfer.amount)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      <DateTime date={transfer.createdAt} />
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
