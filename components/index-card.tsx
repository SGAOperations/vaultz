import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface IndexCardProps {
  index: {
    id: string;
    code: string;
    name: string;
  };
  purchases: {
    id: string;
    user: {
      id: string;
      first: string;
      last: string;
    };
    accountId: string;
    description: string;
    amount: number;
  }[];
}

export function IndexCard({ index, purchases }: IndexCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {index.name} ({index.code})
        </CardTitle>
        <CardDescription>
          Total: ${purchases.map((v) => v.amount).reduce((p, c) => p + c)} for{' '}
          {purchases.length} purchases
        </CardDescription>
      </CardHeader>

      <div className="px-6 flex flex-col gap-3">
        {purchases.map((v) => (
          <Card key={v.id} className="flex-row justify-between p-3">
            <p>${v.amount}</p>
            <p>{v.user.first} {v.user.last}</p>
            <p>{v.description}</p>
          </Card>
        ))}
      </div>
    </Card>
  );
}
