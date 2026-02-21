import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function AllocationGroupCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>
      </div>
    </Card>
  );
}

export function AllocationGroupsSkeleton() {
  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      <AllocationGroupCardSkeleton />
      <AllocationGroupCardSkeleton />
      <AllocationGroupCardSkeleton />
      <AllocationGroupCardSkeleton />
    </div>
  );
}
