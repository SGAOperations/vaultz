import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ChevronRight, CreditCard, Plus } from 'lucide-react';

import { getIndex } from '@/prisma/services';
import { getAccountsByIndex } from '@/prisma/services/account';
import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getUsers } from '@/prisma/services/user';

import { formatNumber } from '@/lib/utils';

import { CreateAccountDialog } from '@/components/create-account-dialog';
import { CreatePurchaseDialog } from '@/components/create-purchase-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PurchaseCard } from '@/components/purchase-card';
import { SectionHeader } from '@/components/section-header';
import { StatCards } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Index' };

export default async function Index({
  params,
}: {
  params: Promise<{ indexId: string }>;
}) {
  const { indexId } = await params;

  const index = await getIndex({ id: indexId });
  if (index === null) notFound();

  const allocationGroups = await getAllAllocationGroups();
  const miscAllocations = await getMiscAllocations();
  const accounts = await getAccountsByIndex({ indexId });
  const users = await getUsers();

  const spent = index.purchases.reduce(
    (acc, purchase) => acc + purchase.amount,
    0,
  );

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={index.name}
        description={`Index code: ${index.code}`}
      />

      <StatCards total={index.amount} spent={spent} />

      <div className="mt-6 flex w-full flex-row gap-3">
        <CreatePurchaseDialog
          users={users}
          accounts={accounts}
          allocationGroups={allocationGroups}
          miscAllocations={miscAllocations}
        />
        <CreateAccountDialog
          indexId={indexId}
          trigger={
            <Button variant="outline" className="flex-1 gap-2">
              <Plus className="size-4" />
              Create Account
            </Button>
          }
        />
      </div>

      <SectionHeader title="Accounts" />

      {accounts.length === 0 ? (
        <EmptyState
          message="No accounts yet"
          description="Create accounts to organize this index's budget"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const accountSpent = index.purchases
              .filter((v) => v.accountId === account.id)
              .reduce((acc, purchase) => acc + purchase.amount, 0);
            const remaining = account.amount - accountSpent;

            return (
              <Link
                href={`/account/${account.id}`}
                key={account.id}
                className="group"
              >
                <Card className="hover:border-primary/20 flex items-center gap-3 p-4 transition-all duration-150">
                  <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <CreditCard className="text-primary size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="group-hover:text-primary truncate font-medium transition-colors">
                      {account.name}
                    </p>
                    <p className="text-muted-foreground font-mono text-sm">
                      {account.code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${formatNumber(remaining)}</p>
                    <p className="text-muted-foreground text-xs">remaining</p>
                  </div>
                  <ChevronRight className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <SectionHeader title="Purchases" />

      {index.purchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="Record purchases to track spending in this index"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {index.purchases.map((purchase) => (
            <PurchaseCard key={purchase.id} purchase={purchase} />
          ))}
        </div>
      )}
    </div>
  );
}
