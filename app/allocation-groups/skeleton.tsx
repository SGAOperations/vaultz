import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function AllocationGroupsSummarySkeleton() {
  return (
    <div className="mb-2 flex flex-col gap-3">
      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="relative overflow-hidden p-4">
            <div className="absolute top-3 right-3">
              <Skeleton className="size-9 rounded-lg" />
            </div>
            <div className="flex flex-col gap-0.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-1 h-8 w-32" />
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      </Card>
    </div>
  );
}

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
    <div className="flex w-full flex-col">
      <AllocationGroupsSummarySkeleton />
      <div className="flex items-center justify-between pt-4 pb-2">
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <AllocationGroupCardSkeleton />
        <AllocationGroupCardSkeleton />
        <AllocationGroupCardSkeleton />
        <AllocationGroupCardSkeleton />
      </div>
    </div>
  );
}
