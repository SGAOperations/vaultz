import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IndexWithPurchases } from '@/lib/types';
import Link from 'next/link';

export function IndexCard({
  index: { id, name, code, purchases },
}: {
  index: IndexWithPurchases;
}) {
  return (
    <Link href={`/index/${id}`}>
      <Card className="h-full group hover:bg-accent">
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

        <div className="px-6 flex flex-col gap-3">
          {purchases.slice(0, 3).map((v) => (
            <Card
              key={v.id}
              className="grid grid-cols-6 p-3 items-center group-hover:bg-accent group-hover:border-muted overflow-hidden"
            >
              <p>${v.amount}</p>
              <p className="text-sm col-span-2">
                {v.user.first} {v.user.last}
              </p>
              <p className="truncate text-sm col-span-3">{v.description}</p>
            </Card>
          ))}
          {purchases.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No purchases in this index yet...
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
