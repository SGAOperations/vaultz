import { PurchaseWithUser } from '@/lib/types';

import { Card } from '@/components/ui/card';

export function PurchaseCard({
  purchase: { id, amount, user, description },
}: {
  purchase: PurchaseWithUser;
}) {
  return (
    <Card
      key={id}
      className="group-hover:bg-accent group-hover:border-muted grid grid-cols-6 items-center overflow-hidden p-3"
    >
      <p>${amount}</p>
      <p className="col-span-2 text-sm">
        {user.first} {user.last}
      </p>
      <p className="col-span-3 truncate text-sm">{description}</p>
    </Card>
  );
}
