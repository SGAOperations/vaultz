import Link from 'next/link';

import { ChevronRight, CreditCard, Receipt } from 'lucide-react';

import { IndexWithPurchases } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { PurchaseCard } from '@/components/purchase-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function IndexCard({
  index: { id, name, code, purchases },
}: {
  index: IndexWithPurchases;
}) {
  const total =
    purchases.length === 0
      ? 0
      : purchases.map((v) => v.amount).reduce((p, c) => p + c);

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
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="bg-muted flex items-center gap-1.5 rounded-full px-3 py-1">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">${formatNumber(total)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Receipt className="text-muted-foreground size-4" />
              <span className="text-muted-foreground">
                {purchases.length} purchase{purchases.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {purchases.slice(0, 3).map((v) => (
              <PurchaseCard key={v.id} purchase={v} stopPropagation />
            ))}
            {purchases.length === 0 && (
              <div className="bg-muted/30 flex items-center justify-center rounded-lg border border-dashed px-4 py-6">
                <p className="text-muted-foreground text-center text-sm">
                  No purchases yet
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
