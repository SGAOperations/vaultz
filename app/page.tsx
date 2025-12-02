import {
  BarChart3,
  FolderKanban,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import {
  getDashboardStats,
  getPurchasesByMonth,
  getSpendingByIndex,
} from '@/prisma/services/dashboard';
import { Plus } from 'lucide-react';

import { getMiscAllocations } from '@/prisma/services/allocation';
import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';
import { getAllCategories } from '@/prisma/services/category';
import { getAllDesignations } from '@/prisma/services/designation';
import { getLatestPurchases } from '@/prisma/services/purchase';
import { getUsers } from '@/prisma/services/user';

import { DashboardCharts } from '@/components/dashboard-charts';
import { CreateDesignationDialog } from '@/components/create-designation-dialog';
import { DesignationCard } from '@/components/designation-card';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

export default async function Home() {
  const designations = await getAllDesignations();
  const latestPurchases = await getLatestPurchases(10);
  const users = await getUsers();
  const categories = await getAllCategories();
  const allocationGroups = await getAllAllocationGroups();
  const miscAllocations = await getMiscAllocations();
  const stats = await getDashboardStats();
  const purchasesByMonth = await getPurchasesByMonth();
  const spendingByIndex = await getSpendingByIndex();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Dashboard"
        description="Overview of your financial management system"
      />

      {/* Stats Grid */}
      <div className="mb-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          label="Total Indexes"
          value={stats.totalIndexes}
          iconColor="text-blue-500"
          bgColor="bg-blue-500/10 dark:bg-blue-500/20"
        />
        <StatCard
          icon={Wallet}
          label="Total Accounts"
          value={stats.totalAccounts}
          iconColor="text-purple-500"
          bgColor="bg-purple-500/10 dark:bg-purple-500/20"
        />
        <StatCard
          icon={Receipt}
          label="Total Purchases"
          value={stats.totalPurchases}
          iconColor="text-orange-500"
          bgColor="bg-orange-500/10 dark:bg-orange-500/20"
        title="Designations"
        description="Manage your financial designations and track all purchases"
        actions={
          <CreateDesignationDialog
            trigger={
              <Button className="gap-2 shadow-sm">
                <Plus className="size-4" />
                Create Designation
              </Button>
            }
          />
        }
      />

      {designations.length === 0 ? (
        <EmptyState
          message="No designations yet"
          description="Create your first designation to start tracking purchases"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          iconColor="text-green-500"
          bgColor="bg-green-500/10 dark:bg-green-500/20"
        />
      </div>

      {/* Financial Overview */}
      <div className="mb-6 grid w-full grid-cols-1 gap-3 md:grid-cols-3">
        <FinancialStatCard
          label="Total Budget"
          value={stats.totalBudget}
          icon={Wallet}
          variant="total"
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {designations.map((v, i) => (
            <DesignationCard key={i} designation={v} />
          ))}
        </div>
      )}

      <SectionHeader title="Latest Purchases" />

      {latestPurchases.length === 0 ? (
        <EmptyState
          message="No purchases yet"
          description="Purchases will appear here as they are recorded"
        />
        <FinancialStatCard
          label="Total Spent"
          value={stats.totalSpent}
          icon={TrendingUp}
          variant="spent"
        />
        <FinancialStatCard
          label="Remaining"
          value={stats.remaining}
          icon={BarChart3}
          variant="remaining"
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        purchasesByMonth={purchasesByMonth}
        spendingByIndex={spendingByIndex}
      />
      ) : (
        <div className="flex flex-col gap-2">
          {latestPurchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              users={users}
              categories={categories}
              allocationGroups={allocationGroups}
              miscAllocations={miscAllocations}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  iconColor: string;
  bgColor: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  bgColor,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className={`absolute top-3 right-3 rounded-lg p-2 ${bgColor}`}
        aria-hidden="true"
      >
        <Icon className={`size-5 ${iconColor}`} />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="text-3xl font-bold tracking-tight">
          {value.toLocaleString()}
        </p>
      </div>
    </Card>
  );
}

interface FinancialStatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  variant: 'total' | 'spent' | 'remaining';
}

function FinancialStatCard({
  label,
  value,
  icon: Icon,
  variant,
}: FinancialStatCardProps) {
  const variantStyles = {
    total: {
      bg: 'bg-stat-total/10 dark:bg-stat-total/20',
      iconColor: 'text-stat-total',
    },
    spent: {
      bg: 'bg-stat-spent/10 dark:bg-stat-spent/20',
      iconColor: 'text-stat-spent',
    },
    remaining: {
      bg: 'bg-stat-remaining/10 dark:bg-stat-remaining/20',
      iconColor: 'text-stat-remaining',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className={`absolute top-3 right-3 rounded-lg p-2 ${styles.bg}`}
        aria-hidden="true"
      >
        <Icon className={`size-5 ${styles.iconColor}`} />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <div className="flex items-baseline gap-0.5">
          <span className="text-muted-foreground text-xl">$</span>
          <p className="text-3xl font-bold tracking-tight">
            {value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>
    </Card>
  );
}
