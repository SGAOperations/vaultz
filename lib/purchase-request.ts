import { z } from 'zod/v4';

import type {
  PurchaseRequestEventType,
  PurchaseRequestStatus,
} from '@/prisma/client';

export const purchaseRequestInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(3, 'Must be at least 3 characters')
    .max(200, 'Cannot be longer than 200 characters'),
  amount: z.coerce
    .number<number>('Enter an amount')
    .positive('Must be greater than zero')
    .max(1_000_000, 'Amount is too large')
    .refine(
      (val: number) => Math.abs(Math.round(val * 100) - val * 100) < 0.001,
      'Must contain at most 2 decimal places',
    ),
  allocationId: z.string().min(1, 'Select an allocation'),
  // Required only for methods that need an E-Board purchaser (reimbursements).
  purchaserId: z.string(),
  processTemplateId: z.string().min(1, 'Select a purchasing method'),
  notes: z.string().trim().max(2000, 'Cannot be longer than 2000 characters'),
  attachments: z.array(z.string()).max(5, 'Attach at most 5 files'),
});

export type PurchaseRequestInput = z.infer<typeof purchaseRequestInputSchema>;

// The distinct indexes (budget or cash designations) among these divisions, in
// the order they first appear.
export function indexesOf(
  divisions: { designationId: string; designationLabel: string }[],
): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const d of divisions)
    if (!seen.has(d.designationId))
      seen.set(d.designationId, d.designationLabel);
  return [...seen].map(([id, label]) => ({ id, label }));
}

// Every reimbursement is submitted, approved and paid on this condition.
export const PURCHASER_RULE =
  'The E-Board purchaser named on this request must make the purchase. If it is found that a non-E-Board member made the purchase, the approval is automatically void.';

export const OPEN_REQUEST_STATUSES: PurchaseRequestStatus[] = [
  'PURCHASER_REVIEW',
  'HEAD_REVIEW',
  'NEEDS_REVISION',
  'PENDING',
  'ESCALATED',
];

export const REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  PURCHASER_REVIEW: 'Awaiting purchaser',
  HEAD_REVIEW: 'Awaiting divisional head',
  NEEDS_REVISION: 'Needs revision',
  PENDING: 'Pending',
  ESCALATED: 'Escalated',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  REVOKED: 'Revoked',
};

export const REQUEST_EVENT_LABELS: Record<PurchaseRequestEventType, string> = {
  SUBMITTED: 'Submitted',
  EDITED: 'Edited',
  PURCHASER_APPROVED: 'Approved by the E-Board purchaser',
  HEAD_APPROVED: 'Approved by the divisional head',
  HEAD_SKIPPED: 'Divisional head approval skipped',
  SENT_BACK: 'Sent back for revision',
  CANCELLED: 'Cancelled',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ESCALATED: 'Escalated to the VPOA',
  RETURNED: 'Returned to the Comptroller',
  NOTIFIED: 'VPOA notified on Slack',
  NOTIFY_FAILED: 'Slack notification failed',
  RECODED: 'Coding corrected',
  SIGNED_OFF: 'Signed off by the VPOA',
  REVOKED: 'Approval revoked by the VPOA',
};

export type HeadHolders = 'held' | 'vacant' | 'unknown';

export type HeadStep =
  | { status: 'HEAD_REVIEW' }
  | {
      status: 'PENDING';
      event: { type: 'HEAD_APPROVED' | 'HEAD_SKIPPED'; note: string } | null;
    };

// Where a request goes once it reaches the divisional head step. One person's
// approval covers every consecutive step they hold, so the head step passes
// when the person who just acted (the requester submitting it, or the
// purchaser approving it) holds the head position. A head that isn't set or
// that nobody holds is skipped; when SGAuth can't say, the request waits.
export function resolveHeadStep({
  headPositionKey,
  actorIsHead,
  actorRole,
  holders,
}: {
  headPositionKey: string | null;
  actorIsHead: boolean;
  actorRole: 'requester' | 'purchaser';
  holders: HeadHolders;
}): HeadStep {
  if (!headPositionKey)
    return {
      status: 'PENDING',
      event: {
        type: 'HEAD_SKIPPED',
        note: 'No divisional head is set for this division.',
      },
    };
  if (actorIsHead)
    return {
      status: 'PENDING',
      event: {
        type: 'HEAD_APPROVED',
        note:
          actorRole === 'requester'
            ? 'The requester is the divisional head.'
            : 'Covered by their approval as E-Board purchaser.',
      },
    };
  if (holders === 'vacant')
    return {
      status: 'PENDING',
      event: {
        type: 'HEAD_SKIPPED',
        note: `No one holds the divisional head position (${headPositionKey}) in SGAuth.`,
      },
    };
  return { status: 'HEAD_REVIEW' };
}

export interface StageEvent {
  type: 'PURCHASER_APPROVED' | 'HEAD_APPROVED' | 'HEAD_SKIPPED';
  note: string;
}

export interface Stage {
  status: 'PURCHASER_REVIEW' | 'HEAD_REVIEW' | 'PENDING';
  // The head position still to approve; null once that step is covered or
  // skipped.
  headPositionKey: string | null;
  // Steps passed without a separate approval, for the history.
  events: StageEvent[];
}

type HolderLookup = (positionKey: string) => Promise<HeadHolders>;

// Where a new or edited request starts. A reimbursement waits on its
// purchaser unless the requester is the purchaser; then the divisional head,
// unless the requester holds that position. With the purchaser first, the
// head's vacancy is checked once it's reached.
export async function submissionStage({
  requesterId,
  purchaserId,
  headPositionKey,
  requesterIsHead,
  lookupHolders,
}: {
  requesterId: string;
  purchaserId: string | null;
  headPositionKey: string | null;
  requesterIsHead: boolean;
  lookupHolders: HolderLookup;
}): Promise<Stage> {
  const events: StageEvent[] = [];
  if (purchaserId === requesterId)
    events.push({
      type: 'PURCHASER_APPROVED',
      note: 'The requester is the purchaser.',
    });

  const purchaserFirst = purchaserId !== null && purchaserId !== requesterId;
  const step = resolveHeadStep({
    headPositionKey,
    actorIsHead: requesterIsHead,
    actorRole: 'requester',
    holders:
      purchaserFirst || requesterIsHead || !headPositionKey
        ? 'unknown'
        : await lookupHolders(headPositionKey),
  });
  if (step.status === 'PENDING' && step.event) events.push(step.event);

  return {
    status: purchaserFirst ? 'PURCHASER_REVIEW' : step.status,
    headPositionKey: step.status === 'HEAD_REVIEW' ? headPositionKey : null,
    events,
  };
}

// Where a request goes once its E-Board purchaser approves it.
export async function purchaserApprovalStage({
  headPositionKey,
  purchaserIsHead,
  lookupHolders,
}: {
  headPositionKey: string | null;
  purchaserIsHead: boolean;
  lookupHolders: HolderLookup;
}): Promise<Stage> {
  if (!headPositionKey)
    return { status: 'PENDING', headPositionKey: null, events: [] };
  const step = resolveHeadStep({
    headPositionKey,
    actorIsHead: purchaserIsHead,
    actorRole: 'purchaser',
    holders: purchaserIsHead ? 'unknown' : await lookupHolders(headPositionKey),
  });
  if (step.status === 'HEAD_REVIEW')
    return { status: 'HEAD_REVIEW', headPositionKey, events: [] };
  return {
    status: 'PENDING',
    // A covered step keeps the head; a skipped one has none.
    headPositionKey:
      step.event?.type === 'HEAD_APPROVED' ? headPositionKey : null,
    events: step.event ? [step.event] : [],
  };
}

export interface AllocationBudget {
  allocated: number;
  spent: number;
  // Open (pending or escalated) requests against the allocation, excluding the
  // request being viewed or edited.
  committed: number;
  remaining: number;
}

export function computeAllocationBudget({
  allocated,
  spent,
  committed,
}: Omit<AllocationBudget, 'remaining'>): AllocationBudget {
  return {
    allocated,
    spent,
    committed,
    remaining: roundCents(allocated - spent - committed),
  };
}

// How far over the committed balance a request of `amount` would put the
// allocation, or 0 when it fits.
export function overBudgetBy(budget: AllocationBudget, amount: number): number {
  return Math.max(0, roundCents(amount - budget.remaining));
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}
