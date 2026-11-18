import { describe, expect, it } from 'vitest';

import { buildApprovalTimeline } from '@/lib/approval-timeline';
import type { PurchaseRequestDetail } from '@/lib/types';

type Request = Parameters<typeof buildApprovalTimeline>[0];
type EventType = PurchaseRequestDetail['events'][number]['type'];

const dana = { id: 'dana', first: 'Dana', last: 'Director' };
const pat = { id: 'pat', first: 'Pat', last: 'Purchaser' };
const riley = { id: 'riley', first: 'Riley', last: 'Campus' };
const casey = { id: 'casey', first: 'Casey', last: 'Comptroller' };
const val = { id: 'val', first: 'Val', last: 'Operations' };

let minute = 0;
function event(
  type: EventType,
  actor: typeof dana,
  note: string | null = null,
) {
  minute += 1;
  return {
    id: `e${minute}`,
    type,
    actor,
    note,
    createdAt: new Date(Date.UTC(2026, 10, 18, 12, minute)),
  };
}

function request(overrides: Partial<Request>): Request {
  return {
    status: 'PURCHASER_REVIEW',
    events: [event('SUBMITTED', dana)],
    requester: dana,
    purchaser: pat,
    allocation: {
      id: 'a',
      name: 'Print Materials',
      allocationGroup: { id: 'g', name: 'Marketing' },
    },
    headPositionKey: 'vice-president-of-campus-affairs',
    awaitingHead: null,
    decidedBy: null,
    decidedAt: null,
    signedOffBy: null,
    signedOffAt: null,
    ...overrides,
  };
}

const summary = (r: Request) =>
  buildApprovalTimeline(r).map((s) => `${s.label}: ${s.state}`);

describe('buildApprovalTimeline', () => {
  it('waits on the purchaser with everything after it upcoming', () => {
    const steps = buildApprovalTimeline(request({}));
    expect(steps.map((s) => `${s.label}: ${s.state}`)).toEqual([
      'Submitted: done',
      'E-Board purchaser: current',
      'Divisional head: upcoming',
      'Comptroller: upcoming',
      'VPOA sign-off: upcoming',
    ]);
    expect(steps[1].detail).toBe('Waiting on Pat Purchaser');
    expect(steps[2].detail).toBe('Head of Marketing');
  });

  it('names the head holders while waiting on the head', () => {
    const steps = buildApprovalTimeline(
      request({
        status: 'HEAD_REVIEW',
        events: [event('SUBMITTED', dana), event('PURCHASER_APPROVED', pat)],
        awaitingHead: {
          position: 'Vice President of Campus Affairs',
          holders: ['Riley Campus'],
        },
      }),
    );
    expect(steps[1]).toMatchObject({ state: 'done', detail: 'Pat Purchaser' });
    expect(steps[2]).toMatchObject({
      state: 'current',
      detail: 'Waiting on Riley Campus (Vice President of Campus Affairs)',
    });
  });

  it('shows a fully approved and signed-off reimbursement', () => {
    const approved = event('APPROVED', casey, 'Keep the receipt');
    expect(
      summary(
        request({
          status: 'APPROVED',
          events: [
            event('SUBMITTED', dana),
            event('PURCHASER_APPROVED', pat),
            event('HEAD_APPROVED', riley),
            approved,
          ],
          decidedBy: casey,
          decidedAt: approved.createdAt,
          signedOffBy: val,
          signedOffAt: new Date(approved.createdAt.getTime() + 3_600_000),
        }),
      ),
    ).toEqual([
      'Submitted: done',
      'E-Board purchaser: done',
      'Divisional head: done',
      'Comptroller: done',
      'VPOA sign-off: done',
    ]);
  });

  it('waits on the VPOA after the Comptroller approves', () => {
    const approved = event('APPROVED', casey);
    const steps = buildApprovalTimeline(
      request({
        status: 'APPROVED',
        purchaser: null,
        events: [
          event('SUBMITTED', dana),
          event('HEAD_APPROVED', riley),
          approved,
        ],
        decidedBy: casey,
        decidedAt: approved.createdAt,
      }),
    );
    expect(steps.map((s) => s.key)).toEqual([
      'submitted',
      'head',
      'comptroller',
      'vpoa',
    ]);
    expect(steps[3]).toMatchObject({
      state: 'current',
      detail: 'Waiting on the VPOA',
    });
  });

  it('skips the steps a self-purchasing head covers', () => {
    const steps = buildApprovalTimeline(
      request({
        status: 'PENDING',
        requester: riley,
        purchaser: riley,
        events: [
          event('SUBMITTED', riley),
          event('PURCHASER_APPROVED', riley, 'The requester is the purchaser.'),
          event(
            'HEAD_APPROVED',
            riley,
            'The requester is the divisional head.',
          ),
        ],
      }),
    );
    expect(steps.slice(1, 4).map((s) => [s.state, s.note])).toEqual([
      ['skipped', 'Requester is the purchaser'],
      ['skipped', 'Requester is the head'],
      ['current', null],
    ]);
  });

  it('credits the purchaser when their approval covers the head', () => {
    const steps = buildApprovalTimeline(
      request({
        status: 'PENDING',
        events: [
          event('SUBMITTED', dana),
          event('PURCHASER_APPROVED', pat),
          event(
            'HEAD_APPROVED',
            pat,
            'Covered by their approval as E-Board purchaser.',
          ),
        ],
      }),
    );
    expect(steps[2]).toMatchObject({
      state: 'skipped',
      note: "Covered by Pat Purchaser's approval as purchaser",
    });
  });

  it('shows a skipped head with the reason', () => {
    const steps = buildApprovalTimeline(
      request({
        status: 'PENDING',
        purchaser: null,
        headPositionKey: null,
        events: [
          event('SUBMITTED', dana),
          event(
            'HEAD_SKIPPED',
            dana,
            'No divisional head is set for this division.',
          ),
        ],
      }),
    );
    expect(steps[1]).toMatchObject({
      state: 'skipped',
      note: 'No divisional head is set for this division.',
    });
  });

  it('skips everything the VPOA approval covered', () => {
    const approved = event('APPROVED', val);
    expect(
      summary(
        request({
          status: 'APPROVED',
          events: [event('SUBMITTED', dana), approved],
          decidedBy: val,
          decidedAt: approved.createdAt,
          signedOffBy: val,
          signedOffAt: approved.createdAt,
        }),
      ),
    ).toEqual([
      'Submitted: done',
      'E-Board purchaser: skipped',
      'Divisional head: skipped',
      'Comptroller: skipped',
      'VPOA approval: done',
    ]);
  });

  it('marks where a request was sent back, restarting on resubmission', () => {
    const sentBack = buildApprovalTimeline(
      request({
        status: 'NEEDS_REVISION',
        events: [
          event('SUBMITTED', dana),
          event('PURCHASER_APPROVED', pat),
          event('SENT_BACK', riley, 'Get a second quote'),
        ],
      }),
    );
    expect(sentBack[2]).toMatchObject({
      state: 'sentBack',
      detail: 'Riley Campus',
      note: 'Sent back: Get a second quote',
    });
    expect(sentBack[3].state).toBe('upcoming');

    const resubmitted = buildApprovalTimeline(
      request({
        events: [
          event('SUBMITTED', dana),
          event('PURCHASER_APPROVED', pat),
          event('SENT_BACK', riley, 'Get a second quote'),
          event('EDITED', dana),
        ],
      }),
    );
    expect(resubmitted[0].label).toBe('Resubmitted');
    expect(resubmitted[1].state).toBe('current');
  });

  it.each([
    ['REJECTED', 'Rejected'],
    ['CANCELLED', 'Cancelled'],
  ] as const)('ends a %s request where it stopped', (status, word) => {
    const steps = buildApprovalTimeline(
      request({
        status,
        events: [
          event('SUBMITTED', dana),
          event(
            status,
            status === 'CANCELLED' ? dana : pat,
            'No longer needed',
          ),
        ],
      }),
    );
    expect(steps.map((s) => s.state)).toEqual(['done', 'ended']);
    expect(steps[1].note).toBe(`${word}: No longer needed`);
  });

  it('ends a revoked request at the sign-off', () => {
    const approved = event('APPROVED', casey);
    const steps = buildApprovalTimeline(
      request({
        status: 'REVOKED',
        purchaser: null,
        events: [
          event('SUBMITTED', dana),
          event('HEAD_APPROVED', riley),
          approved,
          event('REVOKED', val, 'Over budget'),
        ],
        decidedBy: casey,
        decidedAt: approved.createdAt,
      }),
    );
    expect(steps.at(-1)).toMatchObject({
      key: 'vpoa',
      state: 'ended',
      note: 'Approval revoked: Over budget',
    });
  });

  it('shows an escalation on the Comptroller step', () => {
    const steps = buildApprovalTimeline(
      request({
        status: 'ESCALATED',
        purchaser: null,
        events: [
          event('SUBMITTED', dana),
          event('HEAD_APPROVED', riley),
          event('ESCALATED', casey, 'Large amount'),
        ],
      }),
    );
    expect(steps[2]).toMatchObject({
      key: 'comptroller',
      state: 'current',
      detail: 'Escalated to the VPOA',
      note: 'Large amount',
    });
  });

  it('labels the head of a whole-index request and omits it for older requests', () => {
    expect(buildApprovalTimeline(request({ allocation: null }))[2].label).toBe(
      'Index head',
    );
    expect(
      summary(
        request({ status: 'PENDING', purchaser: null, headPositionKey: null }),
      ),
    ).toEqual([
      'Submitted: done',
      'Comptroller: current',
      'VPOA sign-off: upcoming',
    ]);
  });
});

describe('buildApprovalTimeline with incomplete history', () => {
  it('places an escalated request on the Comptroller step', () => {
    const steps = buildApprovalTimeline(
      request({ status: 'ESCALATED', headPositionKey: null }),
    );
    expect(steps.map((s) => `${s.key}: ${s.state}`)).toEqual([
      'submitted: done',
      'purchaser: done',
      'comptroller: current',
      'vpoa: upcoming',
    ]);
    expect(steps[1].detail).toBeNull();
  });
});

describe('buildApprovalTimeline sent back past the purchaser', () => {
  it('puts a Comptroller send-back on the Comptroller step', () => {
    const steps = buildApprovalTimeline(
      request({
        status: 'NEEDS_REVISION',
        headPositionKey: null,
        events: [event('SENT_BACK', casey, 'Please add a quote')],
      }),
    );
    expect(steps.map((s) => `${s.key}: ${s.state}`)).toEqual([
      'submitted: done',
      'purchaser: done',
      'comptroller: sentBack',
      'vpoa: upcoming',
    ]);
    expect(steps[2].detail).toBe('Casey Comptroller');
  });
});
