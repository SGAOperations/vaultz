import { IndexCard } from '@/components/index-card';
import { Button } from '@/components/ui/button';
import { getAllIndexes } from '@/prisma/services';
import { Plus } from 'lucide-react';

export default async function Home() {
  const indexes = await getAllIndexes();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {indexes.map((v, i) => (
        <IndexCard
          key={i}
          id={v.id}
          name={v.name}
          code={v.code}
          purchases={v.purchases}
        />
      ))}
      <Button>
        <Plus />
        Create Index
      </Button>
    </div>
  );
}
