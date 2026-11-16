import { PurchaseRequestStatus } from '@/prisma/client';

import { REQUEST_STATUS_LABELS } from '@/lib/purchase-request';
import { cn } from '@/lib/utils';

const STATUS_CLASSES: Record<PurchaseRequestStatus, string> = {
  PURCHASER_REVIEW: 'bg-primary/10 text-primary border-primary/30',
  NEEDS_REVISION: 'bg-warning/10 text-warning border-warning/30',
  PENDING: 'bg-info/10 text-info border-info/30',
  ESCALATED: 'bg-warning/10 text-warning border-warning/30',
  APPROVED: 'bg-success/10 text-success border-success/30',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/30',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
  REVOKED: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function RequestStatusBadge({
  status,
}: {
  status: PurchaseRequestStatus;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        STATUS_CLASSES[status],
      )}
    >
      {REQUEST_STATUS_LABELS[status]}
    </span>
  );
}
