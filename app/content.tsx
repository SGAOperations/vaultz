'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  FolderKanban,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import {
  getDashboardStatsByDesignation,
  getPurchasesByMonthForDesignation,
  getSpendingByCategoryForDesignation,
} from '@/prisma/services/dashboard';

import { cn } from '@/lib/utils';

import { DashboardCharts } from '@/components/dashboard-charts';
import { EmptyState } from '@/components/empty-state';
import { Card } from '@/components/ui/card';

import { ChartsSkeleton, FinancialSkeleton, StatsSkeleton } from './skeleton';

interface ContentProps {
  designationId: string;
}

export function Content({ designationId }: ContentProps) {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ['dashboard-stats', designationId],
    queryFn: () => getDashboardStatsByDesignation(designationId),
  });

  const {
    data: purchasesByMonth,
    isLoading: purchasesLoading,
    isError: purchasesError,
  } = useQuery({
    queryKey: ['dashboard-purchases', designationId],
    queryFn: () => getPurchasesByMonthForDesignation(designationId),
  });

  const {
    data: spendingByCategory,
    isLoading: spendingLoading,
    isError: spendingError,
  } = useQuery({
    queryKey: ['dashboard-spending', designationId],
    queryFn: () => getSpendingByCategoryForDesignation(designationId),
  });

  return (
    <>
      {/* Stats Grid */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : statsError ? (
        <EmptyState message="Failed to load stats" />
      ) : (
        <div className="mb-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            icon={FolderKanban}
            label="Categories"
            value={stats!.totalCategories}
            iconColor="text-purple-500"
            bgColor="bg-purple-500/10 dark:bg-purple-500/20"
          />
          <StatCard
            icon={Receipt}
            label="Total Purchases"
            value={stats!.totalPurchases}
            iconColor="text-orange-500"
            bgColor="bg-orange-500/10 dark:bg-orange-500/20"
          />
        </div>
      )}

      {/* Financial Overview */}
      {statsLoading ? (
        <FinancialSkeleton />
      ) : statsError ? null : (
        <div className="mb-6 grid w-full grid-cols-1 gap-3 md:grid-cols-3">
          <FinancialStatCard
            label="Budget"
            value={stats!.totalBudget}
            icon={Wallet}
            variant="total"
          />
          <FinancialStatCard
            label="Spent"
            value={stats!.totalSpent}
            icon={TrendingUp}
            variant="spent"
          />
          <FinancialStatCard
            label="Remaining"
            value={stats!.remaining}
            icon={BarChart3}
            variant="remaining"
          />
        </div>
      )}

      {/* Charts */}
      {purchasesLoading || spendingLoading ? (
        <ChartsSkeleton />
      ) : purchasesError || spendingError ? (
        <EmptyState message="Failed to load charts" />
      ) : (
        <DashboardCharts
          purchasesByMonth={purchasesByMonth!}
          spendingData={spendingByCategory!}
          spendingChartTitle="Spending by Category"
        />
      )}
    </>
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
