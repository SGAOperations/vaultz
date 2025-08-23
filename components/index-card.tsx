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
      <Card>
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
          {purchases.map((v) => (
            <Card key={v.id} className="flex-row justify-between p-3">
              <p>${v.amount}</p>
              <p>
                {v.user.first} {v.user.last}
              </p>
              <p>{v.description}</p>
            </Card>
          ))}
        </div>
      </Card>
    </Link>
  );
}
