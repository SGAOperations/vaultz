import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import {
  getAssignablePositions,
  getDivisionAccess,
} from '@/prisma/services/division-access';
import { getRequestAccess } from '@/prisma/services/request-access';

import { DivisionAccessEditor } from '@/components/division-access-editor';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Division Access' };

export default async function DivisionAccessPage() {
  if (!(await getRequestAccess()).canEdit) redirect('/divisions');

  const [divisions, positions] = await Promise.all([
    getDivisionAccess(),
    getAssignablePositions(),
  ]);

  return (
    <div className="flex w-full flex-col">
      <Link
        href="/divisions"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 pt-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Division budgets
      </Link>
      <PageHeader
        title="Division Access"
        description="Choose which positions can see each division and request against it. Editors always see every division. Add requester positions under Request Settings."
      />

      {divisions.length === 0 ? (
        <EmptyState
          message="No divisions yet"
          description="Create an allocation group to assign positions to it."
        />
      ) : (
        <DivisionAccessEditor divisions={divisions} positions={positions} />
      )}
    </div>
  );
}
