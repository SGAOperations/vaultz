import type { PersonName, PurchaseRequestDetail } from '@/lib/types';

export type TimelineState =
  | 'done'
  | 'current'
  | 'upcoming'
  | 'skipped'
  | 'sentBack'
  | 'ended';

export interface TimelineStep {
  key: 'submitted' | 'purchaser' | 'head' | 'comptroller' | 'vpoa';
  label: string;
  state: TimelineState;
  // Who acted, or who it's waiting on.
  detail: string | null;
  at: Date | null;
  note: string | null;
}

type TimelineRequest = Pick<
  PurchaseRequestDetail,
  | 'status'
  | 'events'
  | 'requester'
  | 'purchaser'
  | 'allocation'
  | 'headPositionKey'
  | 'awaitingHead'
  | 'decidedBy'
  | 'decidedAt'
  | 'signedOffBy'
  | 'signedOffAt'
>;

type Event = PurchaseRequestDetail['events'][number];

const name = (p: PersonName | null | undefined) =>
  p ? `${p.first} ${p.last}` : null;

// The request's approval chain as it stands, step by step, derived from its
// status and history alone. Only the latest submission counts: an edit or a
// resubmission restarts the chain.
export function buildApprovalTimeline(
  request: TimelineRequest,
): TimelineStep[] {
  const start = request.events.findLastIndex(
    (e) => e.type === 'SUBMITTED' || e.type === 'EDITED',
  );
  const submitted = request.events[start] ?? null;
  const round = request.events.slice(start + 1);
  const find = (...types: Event['type'][]) =>
    round.findLast((e) => types.includes(e.type)) ?? null;

  const approved = find('APPROVED');
  // The VPOA's own approval is their sign-off, and final.
  const vpoaFinal =
    approved !== null &&
    request.signedOffAt !== null &&
    request.decidedAt !== null &&
    request.signedOffBy?.id === request.decidedBy?.id &&
    Math.abs(request.signedOffAt.getTime() - request.decidedAt.getTime()) <
      1000;
  const finalSkip = (step: TimelineStep): TimelineStep => ({
    ...step,
    state: 'skipped',
    detail: null,
    at: null,
    note: 'VPOA approval is final',
  });

  const steps: TimelineStep[] = [
    {
      key: 'submitted',
      label: submitted?.type === 'EDITED' ? 'Resubmitted' : 'Submitted',
      state: 'done',
      detail: name(request.requester),
      at: submitted?.createdAt ?? null,
      note: null,
    },
  ];

  if (request.purchaser) {
    const event = find('PURCHASER_APPROVED');
    const self = event?.note === 'The requester is the purchaser.';
    steps.push(
      event
        ? {
            key: 'purchaser',
            label: 'E-Board purchaser',
            state: self ? 'skipped' : 'done',
            detail: self ? null : name(event.actor),
            at: self ? null : event.createdAt,
            note: self ? 'Requester is the purchaser' : event.note,
          }
        : {
            key: 'purchaser',
            label: 'E-Board purchaser',
            state: 'upcoming',
            detail: name(request.purchaser),
            at: null,
            note: null,
          },
    );
  }

  // Requests submitted before divisional heads existed have no head step.
  const headEvent = find('HEAD_APPROVED', 'HEAD_SKIPPED');
  const hasHeadStep =
    headEvent !== null ||
    request.status === 'HEAD_REVIEW' ||
    request.headPositionKey !== null;
  if (hasHeadStep) {
    const label = request.allocation ? 'Divisional head' : 'Index head';
    const covered =
      headEvent?.type === 'HEAD_APPROVED' &&
      (headEvent.note === 'The requester is the divisional head.' ||
        headEvent.note === 'Covered by their approval as E-Board purchaser.');
    steps.push(
      headEvent === null
        ? {
            key: 'head',
            label,
            state: 'upcoming',
            detail: request.awaitingHead
              ? waitingOn(request.awaitingHead)
              : request.allocation?.allocationGroup
                ? `Head of ${request.allocation.allocationGroup.name}`
                : null,
            at: null,
            note: null,
          }
        : headEvent.type === 'HEAD_SKIPPED'
          ? {
              key: 'head',
              label,
              state: 'skipped',
              detail: null,
              at: null,
              note: headEvent.note,
            }
          : {
              key: 'head',
              label,
              state: covered ? 'skipped' : 'done',
              detail: covered ? null : name(headEvent.actor),
              at: covered ? null : headEvent.createdAt,
              note: covered
                ? headEvent.note === 'The requester is the divisional head.'
                  ? 'Requester is the head'
                  : `Covered by ${name(headEvent.actor)}'s approval as purchaser`
                : headEvent.note,
            },
    );
  }

  steps.push(
    approved && !vpoaFinal
      ? {
          key: 'comptroller',
          label: 'Comptroller',
          state: 'done',
          detail: name(approved.actor),
          at: approved.createdAt,
          note: approved.note,
        }
      : {
          key: 'comptroller',
          label: 'Comptroller',
          state: 'upcoming',
          detail: null,
          at: null,
          note: null,
        },
    request.signedOffAt
      ? {
          key: 'vpoa',
          label: vpoaFinal ? 'VPOA approval' : 'VPOA sign-off',
          state: 'done',
          detail:
            name(request.signedOffBy) ??
            'Approved before sign-off was required',
          at: request.signedOffBy ? request.signedOffAt : null,
          note: vpoaFinal ? approved?.note || null : null,
        }
      : {
          key: 'vpoa',
          label: 'VPOA sign-off',
          state: 'upcoming',
          detail: null,
          at: null,
          note: null,
        },
  );

  // With the VPOA's final approval, every step it covered was skipped.
  if (vpoaFinal)
    return steps.map((s) =>
      s.state === 'upcoming' && s.key !== 'vpoa' ? finalSkip(s) : s,
    );

  return markFrontier(request, steps, round);
}

const WAITING_ON: Record<TimelineStep['key'], string> = {
  submitted: 'the requester',
  purchaser: 'the E-Board purchaser',
  head: 'the head',
  comptroller: 'the Comptroller',
  vpoa: 'the VPOA',
};

function waitingOn(head: NonNullable<TimelineRequest['awaitingHead']>) {
  return head.holders.length > 0
    ? `${head.holders.join(' or ')} (${head.position})`
    : head.position;
}

// The step an open or approved request is waiting on.
const WAITING_STEP: Partial<
  Record<TimelineRequest['status'], TimelineStep['key']>
> = {
  PURCHASER_REVIEW: 'purchaser',
  HEAD_REVIEW: 'head',
  PENDING: 'comptroller',
  ESCALATED: 'comptroller',
  APPROVED: 'vpoa',
};

// Where the request stands: the step its status is waiting on, or for a
// request sent back or ended, the first step not yet passed. Earlier steps
// with no recorded approval (requests from before a step existed) show as
// passed.
function markFrontier(
  request: TimelineRequest,
  steps: TimelineStep[],
  round: Event[],
): TimelineStep[] {
  const last = (type: Event['type']) =>
    round.findLast((e) => e.type === type) ?? null;
  const waiting = WAITING_STEP[request.status];
  // A request sent back or ended stopped at the first step not yet approved;
  // every approval is in its history.
  const at = waiting
    ? steps.findIndex((s) => s.key === waiting)
    : steps.findIndex((s) => s.state === 'upcoming');
  if (at < 0) return steps;
  for (let i = 0; i < at; i++)
    if (steps[i].state === 'upcoming')
      steps[i] = { ...steps[i], state: 'done', detail: null };
  const step = steps[at];
  // A signed-off approval has nothing left to wait on.
  if (step.state !== 'upcoming') return steps;

  const ending = (
    state: TimelineState,
    event: Event | null,
    fallback: string,
  ): TimelineStep => ({
    ...step,
    state,
    detail: name(event?.actor) ?? step.detail,
    at: event?.createdAt ?? null,
    note: [fallback, event?.note].filter(Boolean).join(': '),
  });

  let frontier: TimelineStep;
  let after: 'upcoming' | 'drop' = 'upcoming';
  switch (request.status) {
    case 'PURCHASER_REVIEW':
    case 'HEAD_REVIEW':
    case 'PENDING':
      frontier = {
        ...step,
        state: 'current',
        detail: `Waiting on ${step.detail ?? WAITING_ON[step.key]}`,
      };
      break;
    case 'ESCALATED':
      frontier = {
        ...step,
        state: 'current',
        detail: 'Escalated to the VPOA',
        note: last('ESCALATED')?.note ?? null,
      };
      break;
    case 'APPROVED':
      frontier = { ...step, state: 'current', detail: 'Waiting on the VPOA' };
      break;
    case 'NEEDS_REVISION':
      frontier = ending('sentBack', last('SENT_BACK'), 'Sent back');
      break;
    case 'REJECTED':
      frontier = ending('ended', last('REJECTED'), 'Rejected');
      after = 'drop';
      break;
    case 'CANCELLED':
      frontier = ending('ended', last('CANCELLED'), 'Cancelled');
      after = 'drop';
      break;
    case 'REVOKED':
      frontier = ending('ended', last('REVOKED'), 'Approval revoked');
      after = 'drop';
      break;
  }

  return [
    ...steps.slice(0, at),
    frontier,
    ...(after === 'drop' ? [] : steps.slice(at + 1)),
  ];
}
