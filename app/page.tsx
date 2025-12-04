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
  getSpendingByDesignation,
} from '@/prisma/services/dashboard';

import { cn } from '@/lib/utils';

import { DashboardCharts } from '@/components/dashboard-charts';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

export default async function Home() {
  const stats = await getDashboardStats();
  const purchasesByMonth = await getPurchasesByMonth();
  const spendingByDesignation = await getSpendingByDesignation();

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
          label="Total Designations"
          value={stats.totalDesignations}
          iconColor="text-blue-500"
          bgColor="bg-blue-500/10 dark:bg-blue-500/20"
        />
        <StatCard
          icon={Wallet}
          label="Total Categories"
          value={stats.totalCategories}
          iconColor="text-purple-500"
          bgColor="bg-purple-500/10 dark:bg-purple-500/20"
        />
        <StatCard
          icon={Receipt}
          label="Total Purchases"
          value={stats.totalPurchases}
          iconColor="text-orange-500"
          bgColor="bg-orange-500/10 dark:bg-orange-500/20"
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
        spendingByDesignation={spendingByDesignation}
      />
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
  const isNegative = variant === 'remaining' && value < 0;

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
          <p
            className={cn(
              'text-3xl font-bold tracking-tight',
              isNegative && 'text-destructive',
            )}
          >
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
