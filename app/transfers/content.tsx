'use client';

import { useQuery } from '@tanstack/react-query';

import { getCategoriesByDesignation } from '@/prisma/services/category';
import { getTransfersByDesignation } from '@/prisma/services/transfer';

import { EmptyState } from '@/components/empty-state';
import { TransferHistory } from '@/components/transfer-history';
import { Skeleton } from '@/components/ui/skeleton';

interface ContentProps {
  designationId: string;
}

export function Content({ designationId }: ContentProps) {
  const {
    data: transfers,
    isLoading: transfersLoading,
    isError: transfersError,
  } = useQuery({
    queryKey: ['transfers', designationId],
    queryFn: () => getTransfersByDesignation(designationId),
  });

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery({
    queryKey: ['categories', designationId],
    queryFn: () => getCategoriesByDesignation({ designationId }),
  });

  const isLoading = transfersLoading || categoriesLoading;
  const isError = transfersError || categoriesError;

  if (isLoading)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );

  if (isError) return <EmptyState message="Failed to load transfers" />;

  if (!transfers || !categories) return null;

  return <TransferHistory transfers={transfers} categories={categories} />;
}
