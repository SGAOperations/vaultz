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
    </Card>
  );
}
