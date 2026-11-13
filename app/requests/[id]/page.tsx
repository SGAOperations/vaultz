import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { hasAnyPosition } from '@nusgaops/sgauth';
import {
  ArrowLeft,
  Ban,
  Clock,
  CornerUpLeft,
  Paperclip,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

import {
  getApprovalOptions,
  getPurchaseRequest,
  getRequestFormOptions,
} from '@/prisma/services/purchase-request';
import { getRequestAccess } from '@/prisma/services/request-access';

import { VPOA } from '@/lib/permissions';
import {
  OPEN_REQUEST_STATUSES,
  REQUEST_EVENT_LABELS,
} from '@/lib/purchase-request';
import { formatCurrency, getFileUrl } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { BudgetPanel } from '@/components/purchase-requests/budget-panel';
import { RequestActions } from '@/components/purchase-requests/request-actions';
import { RequestStatusBadge } from '@/components/purchase-requests/request-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Purchase Request' };

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default async function PurchaseRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getRequestAccess();
  if (!access.canUseRequests) return null;

  const { id } = await params;
  const request = await getPurchaseRequest(id);
  if (!request) notFound();

  const isOpen = OPEN_REQUEST_STATUSES.includes(request.status);
  const sentBack = request.events.findLast((e) => e.type === 'SENT_BACK');
  const revoked = request.events.findLast((e) => e.type === 'REVOKED');
  const isVpoa = hasAnyPosition(access.session, [VPOA]);
  const awaitingSignOff =
    request.status === 'APPROVED' && request.signedOffAt === null;
  const [formOptions, approvalOptions] = await Promise.all([
    request.allowedActions.includes('edit') && access.canRequest
      ? getRequestFormOptions()
      : null,
    request.allowedActions.includes('approve')
      ? getApprovalOptions().then((o) => ('error' in o ? null : o))
      : null,
  ]);

  return (
    <div className="flex w-full flex-col gap-4">
      <Link
        href="/requests"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 pt-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        All requests
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {request.description}
            </h1>
            <RequestStatusBadge status={request.status} />
          </div>
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(request.amount)}
          </p>
        </div>
        <RequestActions
          request={request}
          formOptions={formOptions}
          approvalOptions={approvalOptions}
          isVpoa={isVpoa}
        />
      </div>

      {awaitingSignOff && (
        <div className="border-primary/30 bg-primary/10 text-primary flex items-start gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>
            {`Approved${request.decidedBy ? ` by ${request.decidedBy.first} ${request.decidedBy.last}` : ''}; the purchaser can go ahead. Awaiting the VPOA's sign-off.`}
          </span>
        </div>
      )}

      {request.status === 'REVOKED' && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium">
          <Ban className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-col gap-1">
            <span>
              {`Approval revoked${revoked?.actor ? ` by ${revoked.actor.first} ${revoked.actor.last}` : ''}. Its purchase was voided; do not make this purchase.`}
            </span>
            {revoked?.note && (
              <span className="font-normal whitespace-pre-wrap">
                {revoked.note}
              </span>
            )}
          </div>
        </div>
      )}

      {request.status === 'PURCHASER_REVIEW' && (
        <div className="border-primary/30 bg-primary/10 text-primary flex items-start gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <span>
            {`Waiting on ${request.purchaser.first} ${request.purchaser.last} to approve as the E-Board purchaser. The Comptroller reviews it after that.`}
          </span>
        </div>
      )}

      {request.status === 'NEEDS_REVISION' && (
        <div className="border-warning/40 bg-warning/10 text-warning flex items-start gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium">
          <CornerUpLeft className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-col gap-1">
            <span>
              {`Sent back for revision${sentBack?.actor ? ` by ${sentBack.actor.first} ${sentBack.actor.last}` : ''}. Edit the request to resubmit it.`}
            </span>
            {sentBack?.note && (
              <span className="font-normal whitespace-pre-wrap">
                {sentBack.note}
              </span>
            )}
          </div>
        </div>
      )}

      {request.status === 'ESCALATED' && (
        <div className="border-warning/40 bg-warning/10 text-warning flex items-start gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Escalated to the VPOA.{' '}
            {request.escalationNotifyError
              ? `The Slack message failed: ${request.escalationNotifyError}`
              : request.escalationNotifiedAt
                ? 'They were notified on Slack.'
                : 'Sending the Slack message...'}
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Division">
                  {request.allocation.allocationGroup?.name ?? '—'}
                </Field>
                <Field label="Allocation">{request.allocation.name}</Field>
                <Field label="Category">
                  {request.category.code} · {request.category.name}
                </Field>
                <Field label="E-Board purchaser">
                  {request.purchaser.first} {request.purchaser.last}
                </Field>
                <Field label="Purchasing method">
                  {request.purchasingMethod?.name ?? 'Not set'}
                </Field>
                <Field label="Requested by">
                  {request.requester.first} {request.requester.last}
                </Field>
                <Field label="Submitted">
                  <DateTime date={request.createdAt} />
                </Field>
                {request.decidedBy && request.decidedAt && (
                  <Field
                    label={
                      request.status === 'REJECTED'
                        ? 'Rejected by'
                        : 'Approved by'
                    }
                  >
                    {request.decidedBy.first} {request.decidedBy.last} ·{' '}
                    <DateTime date={request.decidedAt} />
                  </Field>
                )}
                {(request.status === 'APPROVED' ||
                  request.status === 'REVOKED') && (
                  <Field label="VPOA sign-off">
                    {request.signedOffBy && request.signedOffAt ? (
                      <>
                        {request.signedOffBy.first} {request.signedOffBy.last} ·{' '}
                        <DateTime date={request.signedOffAt} />
                      </>
                    ) : request.signedOffAt ? (
                      'Approved before sign-off was required'
                    ) : request.status === 'REVOKED' ? (
                      'Revoked'
                    ) : (
                      'Awaiting sign-off'
                    )}
                  </Field>
                )}
                {request.purchaseId &&
                  access.canView &&
                  request.status !== 'REVOKED' && (
                    <Field label="Purchase">
                      <Link
                        href={`/purchases?allocation=${request.allocation.id}`}
                        className="text-primary hover:underline"
                      >
                        View in purchases
                      </Link>
                    </Field>
                  )}
              </dl>
              {request.decisionNote && (
                <div className="bg-muted/50 mt-4 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    {request.status === 'APPROVED' ||
                    request.status === 'REVOKED'
                      ? 'Conditions'
                      : 'Decision note'}
                  </p>
                  <p className="whitespace-pre-wrap">{request.decisionNote}</p>
                </div>
              )}
              {request.notes && (
                <div className="mt-4 text-sm">
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    Justification
                  </p>
                  <p className="whitespace-pre-wrap">{request.notes}</p>
                </div>
              )}
              {request.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {request.attachments.map((key, i) => (
                    <a
                      key={key}
                      href={getFileUrl(key)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-muted hover:bg-accent flex items-center gap-1.5 rounded px-2 py-1 text-sm"
                    >
                      <Paperclip className="size-3.5" />
                      Attachment {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                {request.events.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-col gap-0.5 border-l-2 pl-3"
                  >
                    <span className="text-sm font-medium">
                      {REQUEST_EVENT_LABELS[event.type]}
                      {event.actor && (
                        <span className="text-muted-foreground font-normal">
                          {' '}
                          · {event.actor.first} {event.actor.last}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      <DateTime date={event.createdAt} />
                    </span>
                    {event.note && (
                      <span className="text-sm whitespace-pre-wrap">
                        {event.note}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {isOpen && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Allocation balance</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetPanel budget={request.budget} amount={request.amount} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
