import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function ProcessTemplateCardSkeleton() {
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
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

export function ProcessTemplatesSkeleton() {
  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      <ProcessTemplateCardSkeleton />
      <ProcessTemplateCardSkeleton />
      <ProcessTemplateCardSkeleton />
    </div>
  );
}
