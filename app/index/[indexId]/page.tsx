import { getIndex } from '@/prisma/services';
import { notFound } from 'next/navigation';

export default async function Index({
  params,
}: {
  params: Promise<{ indexId: string }>;
}) {
  const { indexId } = await params;

  const index = await getIndex({ id: indexId });
  if (index === null) notFound();

  return <>{index.code}</>;
}
