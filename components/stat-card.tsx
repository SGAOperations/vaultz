import {
  DollarSign,
  Hash,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { cn, formatNumber } from '@/lib/utils';

import { Card } from '@/components/ui/card';

type StatVariant = 'total' | 'spent' | 'remaining' | 'count' | 'average';

interface StatCardProps {
  value: number;
  label: string;
  variant?: StatVariant;
  format?: 'currency' | 'number';
}

const variantStyles: Record<
  StatVariant,
  { bg: string; icon: typeof Wallet; iconColor: string }
> = {
  total: {
    bg: 'bg-stat-total/10 dark:bg-stat-total/20',
    icon: Wallet,
    iconColor: 'text-stat-total',
  },
  spent: {
    bg: 'bg-stat-spent/10 dark:bg-stat-spent/20',
    icon: TrendingDown,
    iconColor: 'text-stat-spent',
  },
  remaining: {
    bg: 'bg-stat-remaining/10 dark:bg-stat-remaining/20',
    icon: TrendingUp,
    iconColor: 'text-stat-remaining',
  },
  count: {
    bg: 'bg-primary/10 dark:bg-primary/20',
    icon: Receipt,
    iconColor: 'text-primary',
  },
  average: { bg: 'bg-muted', icon: Hash, iconColor: 'text-muted-foreground' },
};

export function StatCard({
  value,
  label,
  variant = 'total',
  format = 'currency',
}: StatCardProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;
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
          {format === 'currency' && (
            <DollarSign className="text-muted-foreground size-4" />
          )}
          <p
            className={cn(
              'text-3xl font-bold tracking-tight',
              isNegative && 'text-destructive',
            )}
          >
            {formatNumber(value)}
          </p>
        </div>
      </div>
    </Card>
  );
}

interface StatCardsProps {
  total: number;
  spent: number;
  remaining?: number;
}

export function StatCards({ total, spent, remaining }: StatCardsProps) {
  const remainingValue = remaining !== undefined ? remaining : total - spent;

  return (
    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
      <StatCard value={total} label="Total Budget" variant="total" />
      <StatCard value={spent} label="Total Spent" variant="spent" />
      <StatCard value={remainingValue} label="Remaining" variant="remaining" />
    </div>
  );
}
