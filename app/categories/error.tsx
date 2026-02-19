'use client';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

export default function CategoriesError({ reset }: { reset: () => void }) {
  return (
    <div className="flex w-full flex-col">
      <PageHeader title="Categories" description="Something went wrong" />
      <EmptyState
        message="Failed to load categories"
        description="There was a problem fetching the categories. Please try again."
      />
      <div className="mt-4 flex justify-center">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
