import { IndexCard } from '@/components/index-card';
import { getAllIndexes } from '@/prisma/services/account';

export default async function Home() {
  const indexes = await getAllIndexes();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {indexes.map((v, i) => (
        <IndexCard key={i} index={v} purchases={v.purchases} />
      ))}
    </div>
  );
}
