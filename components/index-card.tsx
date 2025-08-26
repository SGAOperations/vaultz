import Link from 'next/link';

import { IndexWithPurchases } from '@/lib/types';

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
              : purchases.map((v) => v.amount).reduce((p, c) => p + c)}{' '}
            for {purchases.length} purchases
          </CardDescription>
        </CardHeader>

        <div className="flex flex-col gap-3 px-6">
          {purchases.slice(0, 3).map((v) => (
            <Card
              key={v.id}
              className="group-hover:bg-accent group-hover:border-muted grid grid-cols-6 items-center overflow-hidden p-3"
            >
              <p>${v.amount}</p>
              <p className="col-span-2 text-sm">
                {v.user.first} {v.user.last}
              </p>
              <p className="col-span-3 truncate text-sm">{v.description}</p>
            </Card>
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
