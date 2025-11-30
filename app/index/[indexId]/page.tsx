import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ChevronRight, CreditCard, DollarSign, Plus } from 'lucide-react';

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
        actions={
          <div className="flex gap-2">
            <CreatePurchaseDialog
              users={users}
              accounts={accounts}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
            />
            <CreateAccountDialog
              indexId={indexId}
              trigger={
                <Button variant="outline" className="gap-2">
                  <Plus className="size-4" />
                  Create Account
                </Button>
              }
            />
          </div>
        }
      />

      <StatCards total={index.amount} spent={spent} />

      <SectionHeader title="Accounts" />

      {accounts.length === 0 ? (
        <EmptyState
          message="No accounts yet"
          description="Create accounts to organize this index's budget"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <Card className="hover:border-primary/30 p-5 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-xl">
                        <CreditCard className="text-primary size-6" />
                      </div>
                      <div>
                        <h3 className="group-hover:text-primary text-lg font-semibold transition-colors">
                          {account.name}
                        </h3>
                        <p className="text-muted-foreground font-mono text-sm">
                          {account.code}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="bg-stat-total/10 rounded-lg p-3 text-center">
                      <DollarSign className="text-stat-total mx-auto mb-1 size-4" />
                      <p className="font-semibold">
                        ${formatNumber(account.amount)}
                      </p>
                      <p className="text-muted-foreground text-xs">Budget</p>
                    </div>
                    <div className="bg-stat-spent/10 rounded-lg p-3 text-center">
                      <DollarSign className="text-stat-spent mx-auto mb-1 size-4" />
                      <p className="font-semibold">
                        ${formatNumber(accountSpent)}
                      </p>
                      <p className="text-muted-foreground text-xs">Spent</p>
                    </div>
                    <div className="bg-stat-remaining/10 rounded-lg p-3 text-center">
                      <DollarSign className="text-stat-remaining mx-auto mb-1 size-4" />
                      <p className="font-semibold">
                        ${formatNumber(remaining)}
                      </p>
                      <p className="text-muted-foreground text-xs">Remaining</p>
                    </div>
                  </div>
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
