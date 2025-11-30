import Link from 'next/link';

import { ChevronRight, CreditCard, DollarSign, TrendingUp } from 'lucide-react';

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
      <Card className="hover:border-primary/30 h-full transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
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
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stat-total/10 flex flex-col items-center rounded-lg p-3">
              <DollarSign className="text-stat-total mb-1 size-4" />
              <span className="text-lg font-semibold">
                ${formatNumber(amount)}
              </span>
              <span className="text-muted-foreground text-xs">Total</span>
            </div>
            <div className="bg-stat-spent/10 flex flex-col items-center rounded-lg p-3">
              <TrendingUp className="text-stat-spent mb-1 size-4" />
              <span className="text-lg font-semibold">
                ${formatNumber(spent)}
              </span>
              <span className="text-muted-foreground text-xs">Spent</span>
            </div>
            <div className="bg-stat-remaining/10 flex flex-col items-center rounded-lg p-3">
              <DollarSign className="text-stat-remaining mb-1 size-4" />
              <span className="text-lg font-semibold">
                ${formatNumber(remaining)}
              </span>
              <span className="text-muted-foreground text-xs">Remaining</span>
            </div>
          </div>
          <div className="text-muted-foreground mt-3 text-center text-sm">
            {purchases.length} purchase{purchases.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
