import { getAllIndexes } from '@/prisma/services';

import { CreateIndexDialog } from '@/components/create-index-dialog';
import { IndexCard } from '@/components/index-card';

export default async function Home() {
  const indexes = await getAllIndexes();

  return (
    <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
      {indexes.map((v, i) => (
        <IndexCard key={i} index={v} />
      ))}

      <CreateIndexDialog />
    </div>
  );
}
