'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { after } from 'next/server';

import { hasAnyPosition } from '@nusgaops/sgauth';

import {
  Prisma,
  PurchaseRequestEventType,
  PurchaseRequestStatus,
} from '@/prisma/client';
import { Decimal } from '@/prisma/client/runtime/client';
import {
  RequestAccess,
  canUseDivision,
  requireRequestAccess,
  requireSubmitAccess,
} from '@/prisma/services/request-access';

import {
  COMPTROLLER,
  RequestAction,
  VPOA,
  allowedRequestActions,
  isRequestApprover,
} from '@/lib/permissions';
import prisma from '@/lib/prisma';
import {
  AllocationBudget,
  HeadHolders,
  OPEN_REQUEST_STATUSES,
  PURCHASER_RULE,
  PurchaseRequestInput,
  Stage,
  computeAllocationBudget,
  purchaseRequestInputSchema,
  purchaserApprovalStage,
  submissionStage,
} from '@/lib/purchase-request';
import { appOrigin } from '@/lib/sgauth';
import {
  SlackResult,
  escapeSlackText,
  getPositionHolders,
  sendSlackMessageToPositionHolders,
  sendSlackMessageToSgauthUser,
} from '@/lib/slack';
import {
  PersonName,
  PurchaseRequestDetail,
  PurchaseRequestSummary,
  RequestFormOptions,
} from '@/lib/types';
import { ErrorType, ResponseType, formatCurrency } from '@/lib/utils';

const personSelect = { id: true, first: true, last: true } as const;

const summaryInclude = {
  requester: { select: personSelect },
  purchaser: { select: personSelect },
  // A request has no category; the approver sets it on the purchase.
  purchase: {
    select: { category: { select: { id: true, name: true, code: true } } },
  },
  allocation: {
    select: {
      id: true,
      name: true,
      allocationGroup: { select: { id: true, name: true } },
    },
  },
  processTemplate: {
    select: { id: true, name: true, requiresPurchaser: true },
  },
} satisfies Prisma.PurchaseRequestInclude;

type RequestWithSummary = Prisma.PurchaseRequestGetPayload<{
  include: typeof summaryInclude;
}>;

function toSummary(request: RequestWithSummary): PurchaseRequestSummary {
  return {
    id: request.id,
    amount: request.amount.toNumber(),
    description: request.description,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    escalationNotifyError: request.escalationNotifyError,
    requester: request.requester,
    purchaser: request.purchaser,
    category: request.purchase?.category ?? null,
    allocation: request.allocation,
    purchasingMethod: request.processTemplate,
    headPositionKey: request.headPositionKey,
    signedOffAt: request.signedOffAt,
  };
}

type Parties = {
  requesterId: string;
  purchaserId: string | null;
  headPositionKey: string | null;
};

function holdsHead(
  access: RequestAccess,
  request: { headPositionKey: string | null },
): boolean {
  return (
    request.headPositionKey !== null &&
    hasAnyPosition(access.session, [request.headPositionKey])
  );
}

function canSee(access: RequestAccess, request: Parties): boolean {
  return (
    access.canView ||
    request.requesterId === access.user.id ||
    request.purchaserId === access.user.id ||
    holdsHead(access, request)
  );
}

// A separate purchaser step: a named purchaser who isn't the requester.
function hasPurchaserStep(request: Parties): boolean {
  return (
    request.purchaserId !== null && request.purchaserId !== request.requesterId
  );
}

function actionsFor(
  access: RequestAccess,
  request: Parties & {
    status: PurchaseRequestStatus;
    signedOffAt: Date | null;
  },
): RequestAction[] {
  return allowedRequestActions({
    session: access.session,
    status: request.status,
    isOwner: request.requesterId === access.user.id,
    isPurchaser: request.purchaserId === access.user.id,
    isHead: holdsHead(access, request),
    hasPurchaserStep: hasPurchaserStep(request),
    isSignedOff: request.signedOffAt !== null,
  });
}

function revalidateRequest(id?: string) {
  revalidatePath('/requests');
  if (id) revalidatePath(`/requests/${id}`);
}

async function getAllocationBudget(
  allocationId: string,
  excludeRequestId?: string,
): Promise<AllocationBudget> {
  const [allocation, spent, committed] = await Promise.all([
    prisma.allocation.findUniqueOrThrow({
      where: { id: allocationId },
      select: { amount: true },
    }),
    prisma.purchase.aggregate({
      where: { allocationId, deletedAt: null, excludeFromTotal: false },
      _sum: { amount: true },
    }),
    prisma.purchaseRequest.aggregate({
      where: {
        allocationId,
        deletedAt: null,
        status: { in: OPEN_REQUEST_STATUSES },
        ...(excludeRequestId && { id: { not: excludeRequestId } }),
      },
      _sum: { amount: true },
    }),
  ]);

  return computeAllocationBudget({
    allocated: allocation.amount.toNumber(),
    spent: spent._sum.amount?.toNumber() ?? 0,
    committed: committed._sum.amount?.toNumber() ?? 0,
  });
}

// Checks the submitted fields against the requester's divisions and returns
// the year the chosen allocation belongs to.
async function validateInput(
  access: RequestAccess,
  raw: PurchaseRequestInput,
): Promise<ResponseType<ValidatedInput>> {
  const parsed = purchaseRequestInputSchema.safeParse(raw);
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? 'Invalid request.',
    } satisfies ErrorType;
  const data = parsed.data;

  const [allocation, purchaser, method, period] = await Promise.all([
    prisma.allocation.findFirst({
      where: { id: data.allocationId, deletedAt: null },
      select: {
        allocationGroupId: true,
        allocationGroup: { select: { headPositionKey: true } },
        designationId: true,
        periodId: true,
        period: { select: { yearId: true } },
      },
    }),
    data.purchaserId
      ? prisma.user.findFirst({
          where: {
            id: data.purchaserId,
            deletedAt: null,
            isEBoardPurchaser: true,
          },
          select: { id: true },
        })
      : null,
    prisma.processTemplate.findFirst({
      where: {
        id: data.processTemplateId,
        deletedAt: null,
        isPurchasingMethod: true,
      },
      select: { id: true, requiresPurchaser: true },
    }),
    getCurrentPeriod(),
  ]);

  if (!allocation || !canUseDivision(access, allocation.allocationGroupId))
    return { error: 'You cannot request against that allocation.' };
  if (!method) return { error: 'Choose one of the listed purchasing methods.' };
  // Only reimbursements name an E-Board purchaser.
  if (method.requiresPurchaser && !data.purchaserId)
    return { error: 'Select an E-Board purchaser.' };
  if (method.requiresPurchaser && !purchaser)
    return { error: 'The purchaser must be an Executive Board member.' };
  if (!period || allocation.periodId !== period.id)
    return {
      error: period
        ? `Choose an allocation from the current period (${period.name}).`
        : 'There is no current period, so requests cannot be submitted right now.',
    };

  return {
    data,
    yearId: allocation.period.yearId,
    purchaserId: method.requiresPurchaser ? data.purchaserId : null,
    headPositionKey: allocation.allocationGroup?.headPositionKey ?? null,
  };
}

interface ValidatedInput {
  data: PurchaseRequestInput;
  yearId: string;
  purchaserId: string | null;
  // The division's head position at submission.
  headPositionKey: string | null;
}

async function loadForAction(
  id: string,
  action: RequestAction,
): Promise<
  ResponseType<{ access: RequestAccess; request: RequestWithSummary }>
> {
  const access = await requireRequestAccess();
  const request = await prisma.purchaseRequest.findFirst({
    where: { id, deletedAt: null },
    include: summaryInclude,
  });
  if (!request || !canSee(access, request))
    return { error: 'Purchase request not found.' };

  if (!actionsFor(access, request).includes(action))
    return {
      error:
        'You cannot do that to this request. It may have changed — refresh and try again.',
    };

  return { access, request };
}

// Moves a request out of `from` only if nobody else changed it first.
async function transition(
  tx: Prisma.TransactionClient,
  {
    id,
    from,
    data,
    event,
    actorId,
    note,
  }: {
    id: string;
    from: PurchaseRequestStatus;
    data: Prisma.PurchaseRequestUncheckedUpdateManyInput;
    event: PurchaseRequestEventType;
    actorId: string;
    note?: string | null;
  },
): Promise<boolean> {
  const { count } = await tx.purchaseRequest.updateMany({
    where: { id, status: from, deletedAt: null },
    data,
  });
  if (count !== 1) return false;
  await tx.purchaseRequestEvent.create({
    data: { requestId: id, type: event, actorId, note: note || null },
  });
  return true;
}

const PURCHASER_RULE_ERROR = {
  error: 'Acknowledge the E-Board purchaser requirement to submit.',
} satisfies ErrorType;

const PURCHASER_RULE_ACKNOWLEDGED = `Acknowledged: ${PURCHASER_RULE}`;

const STALE_ERROR = {
  error: 'This request changed while you were viewing it. Refresh and retry.',
} satisfies ErrorType;

export async function listPurchaseRequests({
  scope,
}: {
  scope: 'mine' | 'all';
}): Promise<PurchaseRequestSummary[]> {
  const access = await requireRequestAccess();
  const onlyMine = scope === 'mine' || !access.canView;

  const requests = await prisma.purchaseRequest.findMany({
    where: {
      deletedAt: null,
      ...(onlyMine && {
        OR: [
          { requesterId: access.user.id },
          { purchaserId: access.user.id },
          {
            headPositionKey: { in: access.session.positions.map((p) => p.key) },
          },
        ],
      }),
    },
    include: summaryInclude,
    orderBy: { createdAt: 'desc' },
  });

  return requests.map(toSummary);
}

export async function getPurchaseRequest(
  id: string,
): Promise<PurchaseRequestDetail | null> {
  const access = await requireRequestAccess();

  const request = await prisma.purchaseRequest.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...summaryInclude,
      decidedBy: { select: personSelect },
      signedOffBy: { select: personSelect },
      events: {
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: personSelect } },
      },
    },
  });
  if (!request || !canSee(access, request)) return null;

  // An open request is already part of `committed`; leave it out so the panel
  // shows the balance before this request.
  const [budget, awaitingHead] = await Promise.all([
    getAllocationBudget(request.allocationId, request.id),
    request.status === 'HEAD_REVIEW' && request.headPositionKey
      ? describeHead(request.headPositionKey)
      : null,
  ]);

  return {
    ...toSummary(request),
    notes: request.notes,
    attachments: request.attachments,
    decidedAt: request.decidedAt,
    decisionNote: request.decisionNote,
    decidedBy: request.decidedBy,
    signedOffBy: request.signedOffBy,
    escalatedAt: request.escalatedAt,
    escalationNotifiedAt: request.escalationNotifiedAt,
    purchaseId: request.purchaseId,
    events: request.events.map((e) => ({
      id: e.id,
      type: e.type,
      note: e.note,
      createdAt: e.createdAt,
      actor: e.actor,
    })),
    allowedActions: actionsFor(access, request),
    budget,
    awaitingHead,
  };
}

// The head position a request waits on and who holds it, for the page. Falls
// back to the key when SGAuth can't be reached.
async function describeHead(
  positionKey: string,
): Promise<PurchaseRequestDetail['awaitingHead']> {
  const result = await getPositionHolders(positionKey);
  if (!result.ok || !result.body) return { position: positionKey, holders: [] };
  return {
    position: result.body.name,
    holders: result.body.holders.map((h) => h.preferredName ?? h.name),
  };
}

export async function getRequestFormOptions(): Promise<RequestFormOptions> {
  const access = await requireSubmitAccess();
  return buildFormOptions(access.divisionIds);
}

// What an approver can recode a request to: every division's allocations and
// categories this year, and every active process template.
export async function getApprovalOptions(): Promise<
  ResponseType<{
    divisions: RequestFormOptions['divisions'];
    methods: { id: string; name: string; requiresPurchaser: boolean }[];
    users: PersonName[];
  }>
> {
  const access = await requireRequestAccess();
  if (!isRequestApprover(access.session))
    return { error: 'Only the Comptroller and the VPOA approve requests.' };

  const [options, methods, users] = await Promise.all([
    buildFormOptions('all'),
    prisma.processTemplate.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, requiresPurchaser: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: personSelect,
      orderBy: [{ last: 'asc' }, { first: 'asc' }],
    }),
  ]);
  return { divisions: options.divisions, methods, users };
}

// Requests are charged to allocations in the period covering today.
async function getCurrentPeriod() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.period.findFirst({
    where: {
      deletedAt: null,
      startDate: { lte: today },
      endDate: { gte: today },
      year: { deletedAt: null },
    },
    select: {
      id: true,
      name: true,
      year: { select: { id: true, name: true } },
    },
    orderBy: { startDate: 'desc' },
  });
}

async function buildFormOptions(
  divisionIds: RequestAccess['divisionIds'],
): Promise<RequestFormOptions> {
  const period = await getCurrentPeriod();

  const [groups, purchasers, purchasingMethods] = await Promise.all([
    period
      ? prisma.allocationGroup.findMany({
          where:
            divisionIds === 'all' ? undefined : { id: { in: divisionIds } },
          orderBy: { name: 'asc' },
          include: {
            designation: {
              include: {
                categories: {
                  where: { deletedAt: null },
                  select: { id: true, name: true, code: true },
                  orderBy: { code: 'asc' },
                },
              },
            },
            allocations: {
              where: { deletedAt: null, periodId: period.id },
              select: {
                id: true,
                name: true,
                period: { select: { name: true } },
              },
              orderBy: [{ period: { startDate: 'asc' } }, { name: 'asc' }],
            },
          },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { deletedAt: null, isEBoardPurchaser: true },
      select: personSelect,
      orderBy: [{ last: 'asc' }, { first: 'asc' }],
    }),
    prisma.processTemplate.findMany({
      where: { deletedAt: null, isPurchasingMethod: true },
      select: {
        id: true,
        name: true,
        description: true,
        requiresPurchaser: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    year: period?.year ?? null,
    period: period ? { id: period.id, name: period.name } : null,
    purchasers,
    purchasingMethods,
    divisions: groups
      .filter((g) => g.allocations.length > 0)
      .map((g) => ({
        id: g.id,
        name: g.name,
        designationId: g.designationId,
        designationLabel: `${g.designation.name} · DN${g.designation.code}`,
        allocations: g.allocations.map((a) => ({
          id: a.id,
          name: a.name,
          periodName: a.period.name,
        })),
        categories: g.designation.categories,
      })),
  };
}

export async function getRequestBudget({
  allocationId,
  excludeRequestId,
}: {
  allocationId: string;
  excludeRequestId?: string;
}): Promise<ResponseType<AllocationBudget>> {
  const access = await requireSubmitAccess();
  const allocation = await prisma.allocation.findFirst({
    where: { id: allocationId, deletedAt: null },
    select: { allocationGroupId: true },
  });
  if (!allocation || !canUseDivision(access, allocation.allocationGroupId))
    return { error: 'Allocation not found.' };

  return getAllocationBudget(allocationId, excludeRequestId);
}

export async function createPurchaseRequest(
  input: PurchaseRequestInput,
  acknowledgedPurchaserRule: boolean,
): Promise<ResponseType<{ id: string }>> {
  const access = await requireSubmitAccess();
  const validated = await validateInput(access, input);
  if ('error' in validated) return validated;
  const { data, yearId, purchaserId } = validated;
  if (purchaserId && acknowledgedPurchaserRule !== true)
    return PURCHASER_RULE_ERROR;
  const stage = await initialStage(access, validated);

  const request = await prisma.purchaseRequest.create({
    data: {
      description: data.description,
      amount: new Decimal(data.amount),
      notes: data.notes || null,
      attachments: data.attachments,
      requesterId: access.user.id,
      purchaserId,
      processTemplateId: data.processTemplateId,
      allocationId: data.allocationId,
      yearId,
      status: stage.status,
      headPositionKey: stage.headPositionKey,
      events: {
        create: [
          {
            type: 'SUBMITTED',
            actorId: access.user.id,
            note: purchaserId ? PURCHASER_RULE_ACKNOWLEDGED : null,
          },
          ...stageEvents(stage, access.user.id),
        ],
      },
    },
    select: { id: true },
  });

  await queueNotices(
    access,
    request.id,
    stageNotices(access, stage, purchaserId, 'New purchase request'),
  );
  revalidateRequest();
  return { id: request.id };
}

export async function updatePurchaseRequest(
  id: string,
  input: PurchaseRequestInput,
  acknowledgedPurchaserRule: boolean,
): Promise<ResponseType<{ id: string }>> {
  const loaded = await loadForAction(id, 'edit');
  if ('error' in loaded) return loaded;
  const { access, request } = loaded;

  const validated = await validateInput(access, input);
  if ('error' in validated) return validated;
  const { data, yearId, purchaserId } = validated;
  if (purchaserId && acknowledgedPurchaserRule !== true)
    return PURCHASER_RULE_ERROR;
  const stage = await initialStage(access, validated);

  // An edit restarts the approval chain.
  const ok = await prisma.$transaction(async (tx) => {
    const moved = await transition(tx, {
      id,
      from: request.status,
      event: 'EDITED',
      actorId: access.user.id,
      note: purchaserId ? PURCHASER_RULE_ACKNOWLEDGED : null,
      data: {
        status: stage.status,
        headPositionKey: stage.headPositionKey,
        description: data.description,
        amount: new Decimal(data.amount),
        notes: data.notes || null,
        attachments: data.attachments,
        purchaserId,
        processTemplateId: data.processTemplateId,
        allocationId: data.allocationId,
        yearId,
      },
    });
    if (moved && stage.events.length > 0)
      await tx.purchaseRequestEvent.createMany({
        data: stageEvents(stage, access.user.id).map((e) => ({
          ...e,
          requestId: id,
        })),
      });
    return moved;
  });
  if (!ok) return STALE_ERROR;

  await queueNotices(
    access,
    id,
    stageNotices(access, stage, purchaserId, 'Purchase request edited'),
  );
  revalidateRequest(id);
  return { id };
}

export async function cancelPurchaseRequest(
  id: string,
): Promise<ResponseType<{ id: string }>> {
  const loaded = await loadForAction(id, 'cancel');
  if ('error' in loaded) return loaded;
  const { request } = loaded;

  const ok = await prisma.$transaction((tx) =>
    transition(tx, {
      id,
      from: request.status,
      event: 'CANCELLED',
      actorId: loaded.access.user.id,
      data: { status: 'CANCELLED' },
    }),
  );
  if (!ok) return STALE_ERROR;

  await queueNotices(
    loaded.access,
    id,
    request.status === 'PURCHASER_REVIEW'
      ? purchaserNotice(loaded.access, request, 'Purchase request cancelled')
      : request.status === 'HEAD_REVIEW'
        ? headNotice(loaded.access, request, 'Purchase request cancelled')
        : [],
  );
  revalidateRequest(id);
  return { id };
}

export async function purchaserApprovePurchaseRequest({
  id,
  note,
}: {
  id: string;
  note?: string;
}): Promise<ResponseType<{ id: string }>> {
  const loaded = await loadForAction(id, 'purchaserApprove');
  if ('error' in loaded) return loaded;
  const { access, request } = loaded;

  // A head step covered or skipped at submission left no head position.
  const stage = await purchaserApprovalStage({
    headPositionKey: request.headPositionKey,
    purchaserIsHead: holdsHead(access, request),
    lookupHolders: headHolders,
  });

  const ok = await prisma.$transaction(async (tx) => {
    const moved = await transition(tx, {
      id,
      from: 'PURCHASER_REVIEW',
      event: 'PURCHASER_APPROVED',
      actorId: access.user.id,
      note,
      data: { status: stage.status, headPositionKey: stage.headPositionKey },
    });
    if (moved && stage.events.length > 0)
      await tx.purchaseRequestEvent.createMany({
        data: stageEvents(stage, access.user.id).map((e) => ({
          ...e,
          requestId: id,
        })),
      });
    return moved;
  });
  if (!ok) return STALE_ERROR;

  await queueNotices(
    access,
    id,
    stage.status === 'HEAD_REVIEW'
      ? headNotice(
          access,
          request,
          'Purchase request needs your approval as divisional head',
          'approved as purchaser',
        )
      : comptrollerNotice(
          access,
          'Purchase request ready for review',
          'approved as purchaser',
        ),
  );
  revalidateRequest(id);
  return { id };
}

export async function headApprovePurchaseRequest({
  id,
  note,
}: {
  id: string;
  note?: string;
}): Promise<ResponseType<{ id: string }>> {
  const loaded = await loadForAction(id, 'headApprove');
  if ('error' in loaded) return loaded;
  const { access } = loaded;

  const ok = await prisma.$transaction((tx) =>
    transition(tx, {
      id,
      from: 'HEAD_REVIEW',
      event: 'HEAD_APPROVED',
      actorId: access.user.id,
      note,
      data: { status: 'PENDING' },
    }),
  );
  if (!ok) return STALE_ERROR;

  await queueNotices(
    access,
    id,
    comptrollerNotice(
      access,
      'Purchase request ready for review',
      'approved as divisional head',
    ),
  );
  revalidateRequest(id);
  return { id };
}

// The default decline: the requester revises it and it goes back through the
// whole approval chain.
export async function sendBackPurchaseRequest({
  id,
  note,
}: {
  id: string;
  note: string;
}): Promise<ResponseType<{ id: string }>> {
  if (!note.trim())
    return { error: 'Add a note telling the requester what to change.' };

  const loaded = await loadForAction(id, 'sendBack');
  if ('error' in loaded) return loaded;
  const { access, request } = loaded;
  const pastHead =
    request.status === 'PENDING' || request.status === 'ESCALATED';
  const pastPurchaser =
    hasPurchaserStep(request) && (pastHead || request.status === 'HEAD_REVIEW');

  const ok = await prisma.$transaction((tx) =>
    transition(tx, {
      id,
      from: request.status,
      event: 'SENT_BACK',
      actorId: access.user.id,
      note: note.trim(),
      data: {
        status: 'NEEDS_REVISION',
        escalatedAt: null,
        escalationNotifiedAt: null,
        escalationNotifyError: null,
      },
    }),
  );
  if (!ok) return STALE_ERROR;

  await queueNotices(access, id, [
    ...requesterNotice(
      access,
      request,
      'Your purchase request was sent back for revision',
      note.trim(),
    ),
    // Everyone who had already moved it along hears it went back too.
    ...(pastPurchaser
      ? purchaserNotice(
          access,
          request,
          'Purchase request sent back for revision; you will be asked to approve it again',
          note.trim(),
        )
      : []),
    ...(pastHead
      ? comptrollerNotice(
          access,
          'Purchase request sent back for revision',
          '',
          note.trim(),
        )
      : []),
  ]);
  revalidateRequest(id);
  return { id };
}

export async function approvePurchaseRequest({
  id,
  note,
  processTemplateId,
  categoryId,
  allocationId,
  recordedUserId,
}: {
  id: string;
  note?: string;
  processTemplateId?: string;
  categoryId?: string;
  allocationId?: string;
  // Who the purchase is recorded under when there's no E-Board purchaser.
  recordedUserId?: string;
}): Promise<ResponseType<{ id: string; purchaseId: string }>> {
  const loaded = await loadForAction(id, 'approve');
  if ('error' in loaded) return loaded;
  const { access, request } = loaded;

  const coding = await resolveCoding(request, {
    processTemplateId,
    categoryId,
    allocationId,
  });
  if ('error' in coding) return coding;
  const userId = await resolveRecordedUser(
    request,
    coding.requiresPurchaser,
    recordedUserId,
  );
  if (!userId) return { error: 'Choose who the purchase is recorded under.' };

  // The VPOA's own approval is their sign-off.
  const isVpoa = hasAnyPosition(access.session, [VPOA]);
  const now = new Date();
  const purchaseId = await prisma.$transaction(async (tx) => {
    if (coding.changes.length > 0)
      await tx.purchaseRequestEvent.create({
        data: {
          requestId: id,
          type: 'RECODED',
          actorId: access.user.id,
          note: coding.changes.join('\n'),
        },
      });

    const ok = await transition(tx, {
      id,
      from: request.status,
      event: 'APPROVED',
      actorId: access.user.id,
      note,
      data: {
        status: 'APPROVED',
        decidedById: access.user.id,
        decidedAt: now,
        decisionNote: note || null,
        allocationId: coding.allocationId,
        yearId: coding.yearId,
        processTemplateId: coding.templateId,
        ...(isVpoa && { signedOffAt: now, signedOffById: access.user.id }),
      },
    });
    if (!ok) return null;

    // The request keeps the requested amount; the purchase is edited later if
    // the actual amount or date differs.
    const purchase = await tx.purchase.create({
      data: {
        userId,
        categoryId: coding.categoryId,
        allocationId: coding.allocationId,
        yearId: coding.yearId,
        description: request.description,
        amount: request.amount,
        notes: request.notes,
        purchasedAt: now,
        receipts: [],
        ...(coding.templateId && {
          process: {
            create: { templateId: coding.templateId, startedAt: now },
          },
        }),
      },
      select: { id: true },
    });
    await tx.purchaseRequest.update({
      where: { id },
      data: { purchaseId: purchase.id },
    });
    return purchase.id;
  });
  if (!purchaseId) return STALE_ERROR;

  const approvalNotices: Notice[] = [
    ...(isVpoa
      ? decisionNotices(access, request, 'approved', note)
      : [
          ...vpoaNotice(access, 'Purchase approved, needs your sign-off'),
          ...requesterNotice(
            access,
            request,
            'Your purchase request was approved',
            note,
          ),
        ]),
    ...purchaserNotice(
      access,
      request,
      'Purchase approved, you can go ahead',
      note,
    ),
  ];
  await queueNotices(
    access,
    id,
    approvalNotices.map((n) => ({
      ...n,
      noteLabel: 'Conditions',
      ...(n.to === 'purchaser' && { footer: PURCHASER_RULE }),
    })),
  );
  revalidateRequest(id);
  revalidatePath('/');
  revalidatePath('/purchases');
  return { id, purchaseId };
}

// A reimbursement's purchase is recorded under its E-Board purchaser; any other
// purchase under the user the approver picks.
async function resolveRecordedUser(
  request: RequestWithSummary,
  requiresPurchaser: boolean,
  recordedUserId?: string,
): Promise<string | null> {
  if (requiresPurchaser && request.purchaserId) return request.purchaserId;
  if (!recordedUserId) return null;
  const user = await prisma.user.findFirst({
    where: { id: recordedUserId, deletedAt: null },
    select: { id: true },
  });
  return user?.id ?? null;
}

// Applies an approver's coding corrections and describes what changed.
async function resolveCoding(
  request: RequestWithSummary,
  input: {
    processTemplateId?: string;
    categoryId?: string;
    allocationId?: string;
  },
): Promise<
  ResponseType<{
    categoryId: string;
    allocationId: string;
    yearId: string;
    templateId: string | null;
    requiresPurchaser: boolean;
    changes: string[];
  }>
> {
  const allocationId = input.allocationId || request.allocationId;
  const categoryId = input.categoryId;
  const templateId = input.processTemplateId || request.processTemplateId;

  const [allocation, category, template] = await Promise.all([
    prisma.allocation.findFirst({
      where: { id: allocationId, deletedAt: null },
      select: {
        name: true,
        designationId: true,
        periodId: true,
        period: { select: { yearId: true } },
      },
    }),
    categoryId
      ? prisma.category.findFirst({
          where: { id: categoryId, deletedAt: null },
          select: { code: true, name: true, designationId: true },
        })
      : null,
    templateId
      ? prisma.processTemplate.findFirst({
          where: { id: templateId, deletedAt: null },
          select: { name: true, requiresPurchaser: true },
        })
      : null,
  ]);
  if (!allocation) return { error: 'That allocation no longer exists.' };
  // A request keeps its own allocation, but recoding moves it to the current
  // period's allocations only.
  if (allocationId !== request.allocationId) {
    const period = await getCurrentPeriod();
    if (!period || allocation.periodId !== period.id)
      return { error: 'Recode to an allocation from the current period.' };
  }
  // The approver categorizes the purchase; requesters don't.
  if (!categoryId || !category)
    return { error: 'Choose a category for the purchase.' };
  if (category.designationId !== allocation.designationId)
    return { error: "That category does not belong to the allocation's fund." };
  if (templateId && !template)
    return {
      error:
        'That purchasing method no longer exists. Choose another before approving.',
    };

  const changes: string[] = [];
  if (allocationId !== request.allocationId)
    changes.push(`Allocation: ${request.allocation.name} → ${allocation.name}`);
  if (templateId !== request.processTemplateId)
    changes.push(
      `Purchasing method: ${request.processTemplate?.name ?? 'Not set'} → ${template?.name ?? 'Not set'}`,
    );

  return {
    categoryId,
    allocationId,
    yearId: allocation.period.yearId,
    templateId,
    requiresPurchaser: template?.requiresPurchaser ?? false,
    changes,
  };
}

export async function signOffPurchaseRequest(
  id: string,
): Promise<ResponseType<{ id: string }>> {
  const loaded = await loadForAction(id, 'signOff');
  if ('error' in loaded) return loaded;
  const { access, request } = loaded;

  const ok = await prisma.$transaction(async (tx) => {
    const { count } = await tx.purchaseRequest.updateMany({
      where: { id, status: 'APPROVED', signedOffAt: null, deletedAt: null },
      data: { signedOffAt: new Date(), signedOffById: access.user.id },
    });
    if (count !== 1) return false;
    await tx.purchaseRequestEvent.create({
      data: { requestId: id, type: 'SIGNED_OFF', actorId: access.user.id },
    });
    return true;
  });
  if (!ok) return STALE_ERROR;

  await queueNotices(access, id, [
    ...comptrollerNotice(access, 'Purchase signed off by the VPOA'),
    ...purchaserNotice(access, request, 'Purchase signed off by the VPOA'),
    ...requesterNotice(
      access,
      request,
      'Your purchase request was signed off by the VPOA',
    ),
  ]);
  revalidateRequest(id);
  return { id };
}

// Cancels an approval the VPOA won't sign off on and voids its purchase.
export async function revokePurchaseRequest({
  id,
  reason,
}: {
  id: string;
  reason: string;
}): Promise<ResponseType<{ id: string }>> {
  if (!reason.trim()) return { error: 'Give a reason for revoking it.' };

  const loaded = await loadForAction(id, 'revoke');
  if ('error' in loaded) return loaded;
  const { access, request } = loaded;
  const now = new Date();

  const ok = await prisma.$transaction(async (tx) => {
    const { count } = await tx.purchaseRequest.updateMany({
      where: { id, status: 'APPROVED', signedOffAt: null, deletedAt: null },
      data: { status: 'REVOKED' },
    });
    if (count !== 1) return false;
    await tx.purchaseRequestEvent.create({
      data: {
        requestId: id,
        type: 'REVOKED',
        actorId: access.user.id,
        note: reason.trim(),
      },
    });
    if (request.purchaseId)
      await tx.purchase.updateMany({
        where: { id: request.purchaseId, deletedAt: null },
        data: { deletedAt: now },
      });
    return true;
  });
  if (!ok) return STALE_ERROR;

  await queueNotices(access, id, [
    ...comptrollerNotice(
      access,
      'Purchase approval revoked',
      '',
      reason.trim(),
    ),
    ...purchaserNotice(
      access,
      request,
      'Purchase approval revoked, do not make this purchase',
      reason.trim(),
    ),
    ...requesterNotice(
      access,
      request,
      'Your purchase request approval was revoked',
      reason.trim(),
    ),
  ]);
  revalidateRequest(id);
  revalidatePath('/');
  revalidatePath('/purchases');
  return { id };
}

export async function rejectPurchaseRequest({
  id,
  note,
}: {
  id: string;
  note?: string;
}): Promise<ResponseType<{ id: string }>> {
  const loaded = await loadForAction(id, 'reject');
  if ('error' in loaded) return loaded;
  const { access, request } = loaded;

  const ok = await prisma.$transaction((tx) =>
    transition(tx, {
      id,
      from: request.status,
      event: 'REJECTED',
      actorId: access.user.id,
      note,
      data: {
        status: 'REJECTED',
        decidedById: access.user.id,
        decidedAt: new Date(),
        decisionNote: note || null,
      },
    }),
  );
  if (!ok) return STALE_ERROR;

  await queueNotices(access, id, [
    ...decisionNotices(access, request, 'rejected', note),
    ...purchaserNotice(
      access,
      request,
      'Purchase request rejected, do not make this purchase',
      note,
    ),
  ]);
  revalidateRequest(id);
  return { id };
}

export async function escalatePurchaseRequest({
  id,
  note,
}: {
  id: string;
  note?: string;
}): Promise<ResponseType<{ id: string; notified: boolean }>> {
  const loaded = await loadForAction(id, 'escalate');
  if ('error' in loaded) return loaded;
  const { access, request } = loaded;

  const ok = await prisma.$transaction((tx) =>
    transition(tx, {
      id,
      from: 'PENDING',
      event: 'ESCALATED',
      actorId: access.user.id,
      note,
      data: {
        status: 'ESCALATED',
        escalatedAt: new Date(),
        escalationNotifiedAt: null,
        escalationNotifyError: null,
      },
    }),
  );
  if (!ok) return STALE_ERROR;

  const notified = await notifyVpoa(access, request, note);
  revalidateRequest(id);
  return { id, notified };
}

export async function returnPurchaseRequest({
  id,
  note,
}: {
  id: string;
  note?: string;
}): Promise<ResponseType<{ id: string }>> {
  const loaded = await loadForAction(id, 'return');
  if ('error' in loaded) return loaded;

  const ok = await prisma.$transaction((tx) =>
    transition(tx, {
      id,
      from: 'ESCALATED',
      event: 'RETURNED',
      actorId: loaded.access.user.id,
      note,
      data: {
        status: 'PENDING',
        escalatedAt: null,
        escalationNotifiedAt: null,
        escalationNotifyError: null,
      },
    }),
  );
  if (!ok) return STALE_ERROR;

  revalidateRequest(id);
  return { id };
}

export async function resendEscalationNotice(
  id: string,
): Promise<ResponseType<{ id: string; notified: boolean }>> {
  const loaded = await loadForAction(id, 'resend');
  if ('error' in loaded) return loaded;

  const notified = await notifyVpoa(loaded.access, loaded.request);
  revalidateRequest(id);
  return { id, notified };
}

type RequestForMessage = Pick<
  RequestWithSummary,
  | 'id'
  | 'description'
  | 'amount'
  | 'allocation'
  | 'requester'
  | 'purchaser'
  | 'processTemplate'
>;

function personName(p: { first: string; last: string }): string {
  return escapeSlackText(`${p.first} ${p.last}`.trim());
}

async function requestUrl(id: string): Promise<string> {
  const host = (await headers()).get('host') ?? '';
  return `${appOrigin(host)}/requests/${id}`;
}

function requestMessage(
  headline: string,
  request: RequestForMessage,
  url: string,
  note?: string | null,
  noteLabel = 'Note',
  footer?: string,
): string {
  const division = request.allocation.allocationGroup?.name ?? 'No division';
  return [
    headline,
    `*${escapeSlackText(request.description)}*: ${formatCurrency(request.amount.toNumber())}`,
    `Division: ${escapeSlackText(division)} · ${escapeSlackText(request.allocation.name)}`,
    `Requested by ${personName(request.requester)}${request.purchaser ? ` · Purchaser ${personName(request.purchaser)}` : ''}`,
    `Purchasing method: ${escapeSlackText(request.processTemplate?.name ?? 'Not set')}`,
    ...(note ? [`${noteLabel}: ${escapeSlackText(note)}`] : []),
    ...(footer ? [`_${escapeSlackText(footer)}_`] : []),
    `<${url}|View in VaultZ>`,
  ].join('\n');
}

interface Notice {
  to: 'comptroller' | 'vpoa' | 'requester' | 'purchaser' | 'head';
  headline: string;
  note?: string | null;
  noteLabel?: string;
  footer?: string;
}

// Whether SGAuth says anyone holds the head position. A position SGAuth
// doesn't know counts as vacant; a failed lookup leaves the request waiting.
async function headHolders(positionKey: string): Promise<HeadHolders> {
  const result = await getPositionHolders(positionKey);
  if (!result.ok) return 'unknown';
  return result.body && result.body.holders.length > 0 ? 'held' : 'vacant';
}

function initialStage(
  access: RequestAccess,
  { purchaserId, headPositionKey }: ValidatedInput,
): Promise<Stage> {
  return submissionStage({
    requesterId: access.user.id,
    purchaserId,
    headPositionKey,
    requesterIsHead: holdsHead(access, { headPositionKey }),
    lookupHolders: headHolders,
  });
}

function stageEvents(stage: Stage, actorId: string) {
  return stage.events.map((e) => ({ ...e, actorId }));
}

// Nobody is told about their own action.
function comptrollerNotice(
  access: RequestAccess,
  title: string,
  byline = '',
  note?: string | null,
): Notice[] {
  if (hasAnyPosition(access.session, [COMPTROLLER])) return [];
  const by = byline ? `${byline} by` : 'by';
  return [
    {
      to: 'comptroller',
      headline: `*${title}*, ${by} ${personName(access.user)}`,
      note,
    },
  ];
}

function vpoaNotice(access: RequestAccess, title: string): Notice[] {
  if (hasAnyPosition(access.session, [VPOA])) return [];
  return [
    {
      to: 'vpoa',
      headline: `*${title}*, approved by ${personName(access.user)}`,
    },
  ];
}

function purchaserNotice(
  access: RequestAccess,
  request: { purchaserId: string | null },
  title: string,
  note?: string | null,
): Notice[] {
  if (!request.purchaserId || request.purchaserId === access.user.id) return [];
  return [
    {
      to: 'purchaser',
      headline: `*${title}* by ${personName(access.user)}`,
      note,
    },
  ];
}

function requesterNotice(
  access: RequestAccess,
  request: { requesterId: string },
  title: string,
  note?: string | null,
): Notice[] {
  if (request.requesterId === access.user.id) return [];
  return [
    {
      to: 'requester',
      headline: `*${title}* by ${personName(access.user)}`,
      note,
    },
  ];
}

function headNotice(
  access: RequestAccess,
  request: { headPositionKey: string | null },
  title: string,
  byline = '',
  note?: string | null,
): Notice[] {
  if (!request.headPositionKey || holdsHead(access, request)) return [];
  const by = byline ? `${byline} by` : 'by';
  return [
    {
      to: 'head',
      headline: `*${title}*, ${by} ${personName(access.user)}`,
      note,
    },
  ];
}

// A new or edited request goes to whoever approves it first.
function stageNotices(
  access: RequestAccess,
  stage: Stage,
  purchaserId: string | null,
  title: string,
): Notice[] {
  if (stage.status === 'PURCHASER_REVIEW')
    return purchaserNotice(
      access,
      { purchaserId },
      `${title}, needs your approval as purchaser`,
    );
  if (stage.status === 'HEAD_REVIEW')
    return headNotice(
      access,
      stage,
      `${title}, needs your approval as divisional head`,
    );
  return comptrollerNotice(access, `${title}, ready for review`);
}

// The Comptroller hears about the VPOA's decisions, and the requester hears
// about any decision they didn't make themselves.
function decisionNotices(
  access: RequestAccess,
  request: RequestWithSummary,
  verb: 'approved' | 'rejected',
  note?: string,
): Notice[] {
  const notices: Notice[] = [];
  const isComptroller = hasAnyPosition(access.session, [COMPTROLLER]);
  if (!isComptroller && hasAnyPosition(access.session, [VPOA]))
    notices.push({
      to: 'comptroller',
      headline: `*The VPOA ${verb} a purchase request*`,
      note,
    });
  notices.push(
    ...requesterNotice(
      access,
      request,
      `Your purchase request was ${verb}`,
      note,
    ),
  );
  return notices;
}

async function sendToSgauthUser(
  sgauthUserId: string | null,
  text: string,
): Promise<SlackResult> {
  if (!sgauthUserId)
    return { ok: false, error: "hasn't signed in to VaultZ yet." };
  return sendSlackMessageToSgauthUser(sgauthUserId, text);
}

const NOTICE_LABELS: Record<Notice['to'], string> = {
  comptroller: 'Comptroller',
  vpoa: 'VPOA',
  requester: 'Requester',
  purchaser: 'Purchaser',
  head: 'Divisional head',
};

// Best-effort DMs, sent after the response so Slack never slows or fails the
// action. A failure is written to the request's history.
async function queueNotices(
  access: RequestAccess,
  requestId: string,
  notices: Notice[],
): Promise<void> {
  if (notices.length === 0) return;
  const url = await requestUrl(requestId);
  const actorId = access.user.id;

  after(async () => {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id: requestId },
      include: {
        ...summaryInclude,
        requester: { select: { ...personSelect, sgauthUserId: true } },
        purchaser: { select: { ...personSelect, sgauthUserId: true } },
      },
    });
    if (!request) return;

    for (const notice of notices) {
      const text = requestMessage(
        notice.headline,
        request,
        url,
        notice.note,
        notice.noteLabel,
        notice.footer,
      );
      const label = NOTICE_LABELS[notice.to];
      // Officers are whoever SGAuth says holds the position now; every
      // current holder is messaged.
      let errors: string[];
      const positionKey =
        notice.to === 'comptroller'
          ? COMPTROLLER
          : notice.to === 'vpoa'
            ? VPOA
            : notice.to === 'head'
              ? request.headPositionKey
              : null;
      if (positionKey) {
        ({ errors } = await sendSlackMessageToPositionHolders(
          positionKey,
          label,
          text,
        ));
      } else if (notice.to === 'head') {
        errors = [];
      } else {
        const result = await sendToSgauthUser(
          notice.to === 'requester'
            ? request.requester.sgauthUserId
            : (request.purchaser?.sgauthUserId ?? null),
          text,
        );
        errors = result.ok ? [] : [result.error];
      }
      for (const error of errors)
        await prisma.purchaseRequestEvent.create({
          data: {
            requestId,
            type: 'NOTIFY_FAILED',
            note: `${label}: ${error}`,
            actorId,
          },
        });
    }
  });
}

// The escalation stands whether or not Slack accepts the message; a failure is
// recorded on the request so the Comptroller can resend it.
async function notifyVpoa(
  access: RequestAccess,
  request: RequestWithSummary,
  note?: string,
): Promise<boolean> {
  const text = requestMessage(
    `*Purchase request escalated to you* by ${personName(access.user)}`,
    request,
    await requestUrl(request.id),
    note,
  );
  const { sent, errors } = await sendSlackMessageToPositionHolders(
    VPOA,
    'VPOA',
    text,
  );
  // Notified once any current VPOA holder has it; anyone missed is still
  // recorded.
  const notified = sent > 0;

  await prisma.$transaction([
    prisma.purchaseRequest.update({
      where: { id: request.id },
      data: notified
        ? { escalationNotifiedAt: new Date(), escalationNotifyError: null }
        : { escalationNotifyError: errors.join(' ') },
    }),
    ...(notified
      ? [
          prisma.purchaseRequestEvent.create({
            data: {
              requestId: request.id,
              type: 'NOTIFIED',
              actorId: access.user.id,
            },
          }),
        ]
      : []),
    ...errors.map((error) =>
      prisma.purchaseRequestEvent.create({
        data: {
          requestId: request.id,
          type: 'NOTIFY_FAILED',
          note: `VPOA: ${error}`,
          actorId: access.user.id,
        },
      }),
    ),
  ]);

  return notified;
}
