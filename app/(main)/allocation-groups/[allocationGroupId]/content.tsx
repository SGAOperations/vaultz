'use client';

import Link from 'next/link';

import { usePeriod } from '@/contexts/PeriodContext';
import { useYear } from '@/contexts/YearContext';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Pencil,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { getAllocationGroupWithStats } from '@/prisma/services/allocation-groups';

import { cn, formatNumber } from '@/lib/utils';

import { CreateAllocationDialog } from '@/components/create-allocation-dialog';
import { EditAllocationDialog } from '@/components/edit-allocation-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { CreatePurchaseDialog } from '@/components/purchase-dialog';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UsageBar } from '@/components/usage-bar';

interface ContentProps {
  allocationGroupId: string;
}

export function Content({ allocationGroupId }: ContentProps) {
  const { selectedPeriod } = usePeriod();
  const { selectedYear } = useYear();

  const { data: allocationGroup } = useQuery({
    queryKey: ['allocation-group', allocationGroupId, selectedPeriod?.id],
    queryFn: () =>
      getAllocationGroupWithStats({
        id: allocationGroupId,
        periodId: selectedPeriod?.id ?? undefined,
      }),
  });

  if (!allocationGroup) return null;

  const description = [
    'Manage allocations and budget for this group',
    `DN${allocationGroup.designation.code}`,
    selectedYear?.name,
    selectedPeriod?.name,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={allocationGroup.name}
        description={description}
        actions={
          <div className="flex gap-2">
            <CreatePurchaseDialog allocationGroups={[allocationGroup]} />
            <Link href={`/purchases?allocationGroup=${allocationGroupId}`}>
              <Button variant="outline" className="gap-2">
                <ShoppingCart className="size-4" />
                View Purchases
              </Button>
            </Link>
            <CreateAllocationDialog
              trigger={
                <Button variant="outline" className="gap-2">
                  <Layers className="size-4" />
                  Create Allocation
                </Button>
              }
              designationId={allocationGroup.designationId}
              allocationGroupId={allocationGroup.id}
            />
          </div>
        }
      />

      <div className="mb-2 flex flex-col gap-3">
        <StatCards
          total={allocationGroup.totalAmount}
          spent={allocationGroup.totalSpent}
        />
        <UsageBar
          total={allocationGroup.totalAmount}
          spent={allocationGroup.totalSpent}
        />
      </div>

      <SectionHeader title="Allocations" />

      {allocationGroup.allocations.length === 0 ? (
        <EmptyState
          message="No allocations yet"
          description="Create allocations to organize this group's budget"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {allocationGroup.allocations.map((allocation) => (
            <div key={allocation.id} className="group relative h-full">
              <Link
                href={`/purchases?allocation=${allocation.id}`}
                className="block h-full"
              >
                <Card className="hover:border-primary/30 h-full p-4 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                        <Layers className="text-primary size-5" />
                      </div>
                      <div>
                        <h3 className="group-hover:text-primary font-semibold transition-colors">
                          {allocation.name}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {allocation.purchases.length} purchase
                          {allocation.purchases.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                      <Wallet className="text-stat-total size-4" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Budget:</span>{' '}
                        <span className="font-semibold">
                          ${formatNumber(allocation.amount)}
                        </span>
                      </span>
                    </div>
                    <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                      <TrendingDown className="text-stat-spent size-4" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Spent:</span>{' '}
                        <span className="font-semibold">
                          ${formatNumber(allocation.spent)}
                        </span>
                      </span>
                    </div>
                    <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
                      <TrendingUp className="text-stat-remaining size-4" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Left:</span>{' '}
                        <span
                          className={cn(
                            'font-semibold',
                            allocation.remaining < 0 && 'text-destructive',
                          )}
                        >
                          ${formatNumber(allocation.remaining)}
                        </span>
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
              <div className="absolute top-3 right-3">
                <EditAllocationDialog
                  allocation={allocation}
                  queryKey={[
                    'allocation-group',
                    allocationGroupId,
                    selectedPeriod?.id,
                  ]}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
