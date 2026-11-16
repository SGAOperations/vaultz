import { redirect } from 'next/navigation';

import { getRequestAccess } from '@/prisma/services/request-access';

import { ContextGuard } from '@/components/context-guard';

// Leadership positions without view access only get the request page.
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getRequestAccess()).canView) redirect('/requests');

  return (
    <>
      <ContextGuard />
      {children}
    </>
  );
}
