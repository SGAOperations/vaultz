import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function StatCardSkeleton() {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="absolute top-3 right-3">
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-1 h-9 w-16" />
      </div>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="mb-6 p-6">
      <Skeleton className="h-[350px] w-full" />
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <div className="mb-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="mb-6 grid w-full grid-cols-1 gap-3 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <ChartSkeleton />
      <ChartSkeleton />
    </>
  );
}
