import Link from 'next/link';

import { IndexWithPurchases } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

import { PurchaseCard } from '@/components/purchase-card';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function IndexCard({
  index: { id, name, code, purchases },
}: {
  index: IndexWithPurchases;
}) {
  return (
    <Link href={`/index/${id}`}>
      <Card className="group hover:bg-accent h-full">
        <CardHeader>
          <CardTitle>
            {name} ({code})
          </CardTitle>
          <CardDescription>
            Total: $
            {purchases.length == 0
              ? 0
              : formatNumber(
                  purchases.map((v) => v.amount).reduce((p, c) => p + c),
                )}{' '}
            for {purchases.length} purchases
          </CardDescription>
        </CardHeader>

        <div
          className="flex flex-col gap-3 px-6"
          onClick={(e) => e.stopPropagation()}
        >
          {purchases.slice(0, 3).map((v) => (
            <PurchaseCard key={v.id} purchase={v} />
          ))}
          {purchases.length === 0 && (
            <p className="text-muted-foreground text-center text-sm">
              No purchases in this index yet...
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
