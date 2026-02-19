'use client';

import { useEffect, useState } from 'react';

import {
  BarChart3,
  FolderKanban,
  Loader2,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import {
  getDashboardStatsByDesignation,
  getPurchasesByMonthForDesignation,
  getSpendingByCategoryForDesignation,
} from '@/prisma/services/dashboard';

import { useDesignation } from '@/contexts/DesignationContext';

import { cn } from '@/lib/utils';

import { DashboardCharts } from '@/components/dashboard-charts';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

type DashboardStats = Awaited<ReturnType<typeof getDashboardStatsByDesignation>>;
type PurchasesByMonth = Awaited<
  ReturnType<typeof getPurchasesByMonthForDesignation>
>;
type SpendingByCategory = Awaited<
  ReturnType<typeof getSpendingByCategoryForDesignation>
>;

export default function Home() {
  const { activeDesignation } = useDesignation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [purchasesByMonth, setPurchasesByMonth] = useState<PurchasesByMonth>(
    [],
  );
  const [spendingByCategory, setSpendingByCategory] =
    useState<SpendingByCategory>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDesignation) return;

    setIsLoading(true);
    setError(null);
    Promise.all([
      getDashboardStatsByDesignation(activeDesignation.id),
      getPurchasesByMonthForDesignation(activeDesignation.id),
      getSpendingByCategoryForDesignation(activeDesignation.id),
    ])
      .then(([statsData, purchasesData, spendingData]) => {
        setStats(statsData);
        setPurchasesByMonth(purchasesData);
        setSpendingByCategory(spendingData);
      })
      .catch(() => setError('Failed to load dashboard data. Please try again.'))
      .finally(() => setIsLoading(false));
  }, [activeDesignation]);

  if (!activeDesignation) {
    return (
      <div className="flex w-full flex-col">
        <PageHeader
          title="Dashboard"
          description="Select a designation to view its overview"
        />
        <EmptyState
          message="No designation selected"
          description="Create a designation to get started"
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title={activeDesignation.name}
        description={`Dashboard · DN${activeDesignation.code}`}
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState message={error} />
      ) : (
        stats && (
          <>
            {/* Stats Grid */}
            <div className="mb-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard
                icon={FolderKanban}
                label="Categories"
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
            </div>

            {/* Financial Overview */}
            <div className="mb-6 grid w-full grid-cols-1 gap-3 md:grid-cols-3">
              <FinancialStatCard
                label="Budget"
                value={stats.totalBudget}
                icon={Wallet}
                variant="total"
              />
              <FinancialStatCard
                label="Spent"
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
              spendingByDesignation={spendingByCategory}
              spendingChartTitle="Spending by Category"
            />
          </>
        )
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
