import { redirect } from 'next/navigation';

export default async function Allocation({
  params,
}: {
  params: Promise<{ allocationId: string }>;
}) {
  const { allocationId } = await params;
  redirect(`/purchases?allocation=${allocationId}`);
}
