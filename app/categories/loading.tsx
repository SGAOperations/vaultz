import { CategoriesListSkeleton } from '@/components/categories-list';
import { PageHeader } from '@/components/page-header';

export default function CategoriesLoading() {
  return (
    <div className="flex w-full flex-col">
      <PageHeader title="Categories" description="Loading categories..." />
      <CategoriesListSkeleton />
    </div>
  );
}
