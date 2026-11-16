import Link from 'next/link';

import { PurchaseRequestSummary } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { EmptyState } from '@/components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { RequestStatusBadge } from './request-status-badge';

interface RequestListProps {
  requests: PurchaseRequestSummary[];
  showRequester: boolean;
  emptyMessage: string;
}

export function RequestList({
  requests,
  showRequester,
  emptyMessage,
}: RequestListProps) {
  if (requests.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request</TableHead>
            <TableHead>Division</TableHead>
            {showRequester && <TableHead>Requester</TableHead>}
            <TableHead>Purchaser</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="max-w-64 truncate font-medium">
                <Link
                  href={`/requests/${request.id}`}
                  className="hover:text-primary hover:underline"
                >
                  {request.description}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {request.allocation.allocationGroup?.name ?? '—'} ·{' '}
                {request.allocation.name}
              </TableCell>
              {showRequester && (
                <TableCell>
                  {request.requester.first} {request.requester.last}
                </TableCell>
              )}
              <TableCell>
                {request.purchaser.first} {request.purchaser.last}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(request.amount)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-0.5">
                  <RequestStatusBadge status={request.status} />
                  {request.status === 'APPROVED' &&
                    request.signedOffAt === null && (
                      <span className="text-muted-foreground text-xs">
                        Awaiting sign-off
                      </span>
                    )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                <DateTime date={request.createdAt} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
