import Link from 'next/link';

import {
  ChevronRight,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { IndexWithPurchases } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function IndexCard({
  index: { id, name, code, purchases, amount },
}: {
  index: IndexWithPurchases;
}) {
  const spent =
    purchases.length === 0
      ? 0
      : purchases.map((v) => v.amount).reduce((p, c) => p + c);
  const remaining = amount - spent;

  return (
    <Link href={`/index/${id}`} className="group">
      <Card className="hover:border-primary/30 h-full gap-2 transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                <CreditCard className="text-primary size-5" />
              </div>
              <div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  {name}
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  {code}
                </CardDescription>
              </div>
            </div>
            <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
              <Wallet className="text-stat-total size-4" />
              <span className="text-sm">
                <span className="text-muted-foreground">Budget:</span>{' '}
                <span className="font-semibold">${formatNumber(amount)}</span>
              </span>
            </div>
            <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
              <TrendingDown className="text-stat-spent size-4" />
              <span className="text-sm">
                <span className="text-muted-foreground">Spent:</span>{' '}
                <span className="font-semibold">${formatNumber(spent)}</span>
              </span>
            </div>
            <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5">
              <TrendingUp className="text-stat-remaining size-4" />
              <span className="text-sm">
                <span className="text-muted-foreground">Left:</span>{' '}
                <span className="font-semibold">
                  ${formatNumber(remaining)}
                </span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
