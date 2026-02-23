import { Metadata } from 'next';

import { getAllYears, getActiveYear } from '@/lib/period-utils';

import { CreateTransferDialog } from '@/components/transfer-dialog';
import { PageHeader } from '@/components/page-header';

import { Content } from './content';

export const metadata: Metadata = { title: 'Transfers' };

export default async function TransfersPage() {
  const [years, activeYear] = await Promise.all([getAllYears(), getActiveYear()]);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Transfers"
        description="Move budget between spending categories"
        actions={
          <CreateTransferDialog
            years={years}
            activeYearId={activeYear?.id}
          />
        }
      />
      <Content years={years} activeYearId={activeYear?.id} />
    </div>
  );
}
