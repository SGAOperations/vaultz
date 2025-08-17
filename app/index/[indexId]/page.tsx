import { getIndex } from '@/prisma/services';

export default async function Index({
  params,
}: {
  params: Promise<{ indexId: string }>;
}) {
  const { indexId } = await params;

  const index = await getIndex({ id: indexId });

  return <>{index.code}</>;
}
