import type { SgaSession } from '@nusgaops/sgauth';
import { describe, expect, it, vi } from 'vitest';

import { allowedRequestActions } from '@/lib/permissions';
import {
  type HeadHolders,
  purchaserApprovalStage,
  submissionStage,
} from '@/lib/purchase-request';

vi.mock('@/lib/prisma', () => ({ default: {} }));
vi.mock('@nusgaops/sgauth/next', () => ({ requireSession: vi.fn() }));

// The examples in #823, walked through the same rules the request service
// uses: where a request starts, where the purchaser's approval sends it, and
// which actions each person gets at every stage.

const VPOA = 'vice-president-of-operational-affairs';
const VPCA = 'vice-president-of-campus-affairs';
const SBP = 'student-body-president';

function person(id: string, ...positions: string[]) {
  const session: SgaSession = {
    user: {
      id,
      email: `${id}@northeastern.edu`,
      name: id,
      preferredName: null,
      isAdmin: false,
      isPrimaryAdmin: false,
    },
    positions: positions.map((key) => ({ key, name: key })),
    session: {
      id: `session-${id}`,
      expiresAt: '2030-01-01T00:00:00.000Z',
      absoluteExpiresAt: '2030-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  };
  return {
    id,
    session,
    holds: (key: string | null) => positions.includes(key ?? ''),
  };
}

const evp = person('evp', 'executive-vice-president');
const vpoa = person('vpoa', VPOA);
const vpca = person('vpca', VPCA);
const sbp = person('sbp', SBP);
const vpaa = person('vpaa', 'vice-president-of-academic-affairs');
const comptroller = person('comptroller', 'comptroller');
const held = async (): Promise<HeadHolders> => 'held';

type Person = ReturnType<typeof person>;

// Records each approval until the request reaches the Comptroller or the
// VPOA's final approval, then the remaining steps.
async function walk({
  requester,
  purchaser,
  head,
}: {
  requester: Person;
  purchaser: Person | null;
  head: string | null;
}): Promise<string[]> {
  const log: string[] = [];
  const actionsOf = (
    who: Person,
    status: Parameters<typeof allowedRequestActions>[0]['status'],
    headPositionKey: string | null,
  ) =>
    allowedRequestActions({
      session: who.session,
      status,
      isOwner: who.id === requester.id,
      isPurchaser: who.id === purchaser?.id,
      isHead: who.holds(headPositionKey),
      hasPurchaserStep: purchaser !== null && purchaser.id !== requester.id,
    });

  let stage = await submissionStage({
    requesterId: requester.id,
    purchaserId: purchaser?.id ?? null,
    headPositionKey: head,
    requesterIsHead: requester.holds(head),
    lookupHolders: held,
  });
  for (const e of stage.events) log.push(`${e.type} (${requester.id})`);

  if (stage.status === 'PURCHASER_REVIEW') {
    if (!purchaser) throw new Error('no purchaser');
    const can = actionsOf(purchaser, stage.status, stage.headPositionKey);
    if (can.includes('approve')) return [...log, `final (${purchaser.id})`];
    expect(can).toContain('purchaserApprove');
    log.push(`purchaser (${purchaser.id})`);
    stage = await purchaserApprovalStage({
      headPositionKey: stage.headPositionKey,
      purchaserIsHead: purchaser.holds(stage.headPositionKey),
      lookupHolders: held,
    });
    for (const e of stage.events) log.push(`${e.type} (${purchaser.id})`);
  }

  if (stage.status === 'HEAD_REVIEW') {
    const heads = [evp, vpoa, vpca, sbp, vpaa].filter((p) =>
      p.holds(stage.headPositionKey),
    );
    const [headPerson] = heads;
    const can = actionsOf(headPerson, stage.status, stage.headPositionKey);
    if (can.includes('approve')) return [...log, `final (${headPerson.id})`];
    expect(can).toContain('headApprove');
    log.push(`head (${headPerson.id})`);
  }

  expect(actionsOf(comptroller, 'PENDING', stage.headPositionKey)).toContain(
    'approve',
  );
  expect(
    allowedRequestActions({
      session: vpoa.session,
      status: 'APPROVED',
      isOwner: false,
      isPurchaser: false,
    }),
  ).toContain('signOff');
  return [...log, 'comptroller', 'vpoa sign-off'];
}

describe('approval chain examples', () => {
  it('Director of Campus Services, EVP purchaser', async () => {
    expect(
      await walk({
        requester: person('director', 'director-of-campus-services'),
        purchaser: evp,
        head: VPCA,
      }),
    ).toEqual([
      'purchaser (evp)',
      'head (vpca)',
      'comptroller',
      'vpoa sign-off',
    ]);
  });

  it('Director of Elections, SBP as purchaser and head', async () => {
    expect(
      await walk({
        requester: person('director', 'director-of-elections'),
        purchaser: sbp,
        head: SBP,
      }),
    ).toEqual([
      'purchaser (sbp)',
      'HEAD_APPROVED (sbp)',
      'comptroller',
      'vpoa sign-off',
    ]);
  });

  it('Digital Innovation Manager, VPOA as purchaser, head and treasurer', async () => {
    expect(
      await walk({
        requester: person('dim', 'digital-innovation-manager'),
        purchaser: vpoa,
        head: VPOA,
      }),
    ).toEqual(['final (vpoa)']);
  });

  it('Webmaster, VPAA purchaser, VPOA head', async () => {
    expect(
      await walk({
        requester: person('webmaster', 'webmaster'),
        purchaser: vpaa,
        head: VPOA,
      }),
    ).toEqual(['purchaser (vpaa)', 'final (vpoa)']);
  });

  it('VP of Campus Affairs requesting for their own division', async () => {
    expect(await walk({ requester: vpca, purchaser: evp, head: VPCA })).toEqual(
      [
        'HEAD_APPROVED (vpca)',
        'purchaser (evp)',
        'comptroller',
        'vpoa sign-off',
      ],
    );
  });

  it('a non-reimbursement goes straight to the head', async () => {
    expect(
      await walk({
        requester: person('director', 'director-of-campus-services'),
        purchaser: null,
        head: VPCA,
      }),
    ).toEqual(['head (vpca)', 'comptroller', 'vpoa sign-off']);
  });

  it('skips a division with no head', async () => {
    expect(
      await walk({
        requester: person('director', 'director-of-campus-services'),
        purchaser: null,
        head: null,
      }),
    ).toEqual(['HEAD_SKIPPED (director)', 'comptroller', 'vpoa sign-off']);
  });

  it('skips a vacant head once the purchaser approves', async () => {
    const stage = await purchaserApprovalStage({
      headPositionKey: VPCA,
      purchaserIsHead: false,
      lookupHolders: async () => 'vacant',
    });
    expect(stage.status).toBe('PENDING');
    expect(stage.headPositionKey).toBeNull();
    expect(stage.events.map((e) => e.type)).toEqual(['HEAD_SKIPPED']);
  });

  it('records a self-purchase and checks the head only when reached', async () => {
    const lookups: string[] = [];
    const stage = await submissionStage({
      requesterId: 'evp',
      purchaserId: 'evp',
      headPositionKey: VPCA,
      requesterIsHead: false,
      lookupHolders: async (key) => {
        lookups.push(key);
        return 'held';
      },
    });
    expect(stage).toEqual({
      status: 'HEAD_REVIEW',
      headPositionKey: VPCA,
      events: [
        { type: 'PURCHASER_APPROVED', note: 'The requester is the purchaser.' },
      ],
    });
    expect(lookups).toEqual([VPCA]);
  });
});
