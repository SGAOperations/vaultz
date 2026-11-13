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
  categoryId: z.string().min(1, 'Select a category'),
  purchaserId: z.string().min(1, 'Select an E-Board purchaser'),
  processTemplateId: z.string().min(1, 'Select a purchasing method'),
  notes: z.string().trim().max(2000, 'Cannot be longer than 2000 characters'),
  attachments: z.array(z.string()).max(5, 'Attach at most 5 files'),
});

export type PurchaseRequestInput = z.infer<typeof purchaseRequestInputSchema>;

export const OPEN_REQUEST_STATUSES: PurchaseRequestStatus[] = [
  'PURCHASER_REVIEW',
  'NEEDS_REVISION',
  'PENDING',
  'ESCALATED',
];

export const REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  PURCHASER_REVIEW: 'Awaiting purchaser',
  NEEDS_REVISION: 'Needs revision',
  PENDING: 'Pending',
  ESCALATED: 'Escalated',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const REQUEST_EVENT_LABELS: Record<PurchaseRequestEventType, string> = {
  SUBMITTED: 'Submitted',
  EDITED: 'Edited',
  PURCHASER_APPROVED: 'Approved by the E-Board purchaser',
  SENT_BACK: 'Sent back for revision',
  CANCELLED: 'Cancelled',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ESCALATED: 'Escalated to the VPOA',
  RETURNED: 'Returned to the Comptroller',
  NOTIFIED: 'VPOA notified on Slack',
  NOTIFY_FAILED: 'Slack notification failed',
};

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
