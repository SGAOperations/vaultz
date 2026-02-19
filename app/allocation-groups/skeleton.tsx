import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function AllocationGroupCardSkeleton() {
  return (
    <Card className="h-full gap-2">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="size-5 rounded-sm" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AllocationGroupsSkeleton() {
  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <AllocationGroupCardSkeleton key={i} />
      ))}
    </div>
  );
}
