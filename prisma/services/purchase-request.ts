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
import { findOfficeHolderEmail } from '@/prisma/services/office-holders';
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
  OPEN_REQUEST_STATUSES,
  PURCHASER_RULE,
  PurchaseRequestInput,
  computeAllocationBudget,
  purchaseRequestInputSchema,
} from '@/lib/purchase-request';
import { appOrigin } from '@/lib/sgauth';
import {
  SlackResult,
  escapeSlackText,
  sendSlackMessageToEmail,
} from '@/lib/slack';
import {
  PurchaseRequestDetail,
  PurchaseRequestSummary,
  RequestFormOptions,
} from '@/lib/types';
import { ErrorType, ResponseType, formatCurrency } from '@/lib/utils';

const personSelect = { id: true, first: true, last: true } as const;

const summaryInclude = {
  requester: { select: personSelect },
  purchaser: { select: personSelect },
  category: { select: { id: true, name: true, code: true } },
  allocation: {
    select: {
      id: true,
      name: true,
      allocationGroup: { select: { id: true, name: true } },
    },
  },
  processTemplate: { select: { id: true, name: true } },
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
    category: request.category,
    allocation: request.allocation,
    purchasingMethod: request.processTemplate,
    signedOffAt: request.signedOffAt,
  };
}

type Parties = { requesterId: string; purchaserId: string };

function canSee(access: RequestAccess, request: Parties): boolean {
  return (
    access.canView ||
    request.requesterId === access.user.id ||
    request.purchaserId === access.user.id
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
): Promise<ResponseType<{ data: PurchaseRequestInput; yearId: string }>> {
  const parsed = purchaseRequestInputSchema.safeParse(raw);
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? 'Invalid request.',
    } satisfies ErrorType;
  const data = parsed.data;

  const [allocation, category, purchaser, method] = await Promise.all([
    prisma.allocation.findFirst({
      where: { id: data.allocationId, deletedAt: null },
      select: {
        allocationGroupId: true,
        designationId: true,
        period: { select: { yearId: true } },
      },
    }),
    prisma.category.findFirst({
      where: { id: data.categoryId, deletedAt: null },
      select: { designationId: true },
    }),
    prisma.user.findFirst({
      where: { id: data.purchaserId, deletedAt: null, isEBoardPurchaser: true },
      select: { id: true },
    }),
    prisma.processTemplate.findFirst({
      where: {
        id: data.processTemplateId,
        deletedAt: null,
        isPurchasingMethod: true,
      },
      select: { id: true },
    }),
  ]);

  if (!allocation || !canUseDivision(access, allocation.allocationGroupId))
    return { error: 'You cannot request against that allocation.' };
  if (!category || category.designationId !== allocation.designationId)
    return { error: "That category does not belong to the allocation's fund." };
  if (!purchaser)
    return { error: 'The purchaser must be an Executive Board member.' };
  if (!method) return { error: 'Choose one of the listed purchasing methods.' };

  return { data, yearId: allocation.period.yearId };
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
        OR: [{ requesterId: access.user.id }, { purchaserId: access.user.id }],
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
  const budget = await getAllocationBudget(request.allocationId, request.id);

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
    methods: { id: string; name: string }[];
  }>
> {
  const access = await requireRequestAccess();
  if (!isRequestApprover(access.session))
    return { error: 'Only the Comptroller and the VPOA approve requests.' };

  const [options, methods] = await Promise.all([
    buildFormOptions('all'),
    prisma.processTemplate.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  return { divisions: options.divisions, methods };
}

async function buildFormOptions(
  divisionIds: RequestAccess['divisionIds'],
): Promise<RequestFormOptions> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = await prisma.year.findFirst({
    where: {
      deletedAt: null,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { id: true, name: true },
  });

  const [groups, purchasers, purchasingMethods] = await Promise.all([
    year
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
              where: {
                deletedAt: null,
                period: { yearId: year.id, deletedAt: null },
              },
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
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    year,
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
  if (acknowledgedPurchaserRule !== true) return PURCHASER_RULE_ERROR;
  const validated = await validateInput(access, input);
  if ('error' in validated) return validated;
  const { data, yearId } = validated;

  const request = await prisma.purchaseRequest.create({
    data: {
      description: data.description,
      amount: new Decimal(data.amount),
      notes: data.notes || null,
      attachments: data.attachments,
      requesterId: access.user.id,
      purchaserId: data.purchaserId,
      processTemplateId: data.processTemplateId,
      categoryId: data.categoryId,
      allocationId: data.allocationId,
      yearId,
      ...stageAfterSubmit(access, data.purchaserId),
      events: {
        create: [
          {
            type: 'SUBMITTED',
            actorId: access.user.id,
            note: PURCHASER_RULE_ACKNOWLEDGED,
          },
          ...selfApprovalEvents(access, data.purchaserId),
        ],
      },
    },
    select: { id: true, status: true },
  });

  await queueNotices(
    access,
    request.id,
    submittedNotices(
      access,
      request.status,
      data.purchaserId,
      'New purchase request',
    ),
  );
  revalidateRequest();
  return { id: request.id };
}

export async function updatePurchaseRequest(
  id: string,
  input: PurchaseRequestInput,
  acknowledgedPurchaserRule: boolean,
): Promise<ResponseType<{ id: string }>> {
  if (acknowledgedPurchaserRule !== true) return PURCHASER_RULE_ERROR;
  const loaded = await loadForAction(id, 'edit');
  if ('error' in loaded) return loaded;
  const { access, request } = loaded;

  const validated = await validateInput(access, input);
  if ('error' in validated) return validated;
  const { data, yearId } = validated;
  const stage = stageAfterSubmit(access, data.purchaserId);

  // An edit always goes back through the purchaser, unless the requester is
  // the purchaser.
  const ok = await prisma.$transaction(async (tx) => {
    const moved = await transition(tx, {
      id,
      from: request.status,
      event: 'EDITED',
      actorId: access.user.id,
      note: PURCHASER_RULE_ACKNOWLEDGED,
      data: {
        ...stage,
        description: data.description,
        amount: new Decimal(data.amount),
        notes: data.notes || null,
        attachments: data.attachments,
        purchaserId: data.purchaserId,
        processTemplateId: data.processTemplateId,
        categoryId: data.categoryId,
        allocationId: data.allocationId,
        yearId,
      },
    });
    if (moved)
      await tx.purchaseRequestEvent.createMany({
        data: selfApprovalEvents(access, data.purchaserId).map((e) => ({
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
    submittedNotices(
      access,
      stage.status,
      data.purchaserId,
      'Purchase request edited',
    ),
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
  const { access } = loaded;

  const ok = await prisma.$transaction((tx) =>
    transition(tx, {
      id,
      from: 'PURCHASER_REVIEW',
      event: 'PURCHASER_APPROVED',
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
      'approved as purchaser',
    ),
  );
  revalidateRequest(id);
  return { id };
}

// The default decline: the requester revises it and it goes back through the
// purchaser.
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

  await queueNotices(
    access,
    id,
    requesterNotice(
      access,
      request,
      'Your purchase request was sent back for revision',
      note.trim(),
    ),
  );
  revalidateRequest(id);
  return { id };
}

export async function approvePurchaseRequest({
  id,
  note,
  processTemplateId,
  categoryId,
  allocationId,
}: {
  id: string;
  note?: string;
  processTemplateId?: string;
  categoryId?: string;
  allocationId?: string;
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
        categoryId: coding.categoryId,
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
        userId: request.purchaserId,
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
    changes: string[];
  }>
> {
  const allocationId = input.allocationId || request.allocationId;
  const categoryId = input.categoryId || request.categoryId;
  const templateId = input.processTemplateId || request.processTemplateId;

  const [allocation, category, template] = await Promise.all([
    prisma.allocation.findFirst({
      where: { id: allocationId, deletedAt: null },
      select: {
        name: true,
        designationId: true,
        period: { select: { yearId: true } },
      },
    }),
    prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null },
      select: { code: true, name: true, designationId: true },
    }),
    templateId
      ? prisma.processTemplate.findFirst({
          where: { id: templateId, deletedAt: null },
          select: { name: true },
        })
      : null,
  ]);
  if (!allocation) return { error: 'That allocation no longer exists.' };
  if (!category || category.designationId !== allocation.designationId)
    return { error: "That category does not belong to the allocation's fund." };
  if (templateId && !template)
    return {
      error:
        'That purchasing method no longer exists. Choose another before approving.',
    };

  const changes: string[] = [];
  if (allocationId !== request.allocationId)
    changes.push(`Allocation: ${request.allocation.name} → ${allocation.name}`);
  if (categoryId !== request.categoryId)
    changes.push(
      `Category: ${request.category.code} ${request.category.name} → ${category.code} ${category.name}`,
    );
  if (templateId !== request.processTemplateId)
    changes.push(
      `Purchasing method: ${request.processTemplate?.name ?? 'Not set'} → ${template?.name ?? 'Not set'}`,
    );

  return {
    categoryId,
    allocationId,
    yearId: allocation.period.yearId,
    templateId,
    changes,
  };
}

export async function signOffPurchaseRequest(
  id: string,
): Promise<ResponseType<{ id: string }>> {
  const loaded = await loadForAction(id, 'signOff');
  if ('error' in loaded) return loaded;
  const { access } = loaded;

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

  await queueNotices(
    access,
    id,
    decisionNotices(access, request, 'rejected', note),
  );
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
    `Requested by ${personName(request.requester)} · Purchaser ${personName(request.purchaser)}`,
    `Purchasing method: ${escapeSlackText(request.processTemplate?.name ?? 'Not set')}`,
    ...(note ? [`${noteLabel}: ${escapeSlackText(note)}`] : []),
    ...(footer ? [`_${escapeSlackText(footer)}_`] : []),
    `<${url}|View in VaultZ>`,
  ].join('\n');
}

interface Notice {
  to: 'comptroller' | 'vpoa' | 'requester' | 'purchaser';
  headline: string;
  note?: string | null;
  noteLabel?: string;
  footer?: string;
}

// A request skips the purchaser step when its requester is the purchaser.
function isSelfPurchased(access: RequestAccess, purchaserId: string): boolean {
  return purchaserId === access.user.id;
}

function stageAfterSubmit(
  access: RequestAccess,
  purchaserId: string,
): { status: PurchaseRequestStatus } {
  return {
    status: isSelfPurchased(access, purchaserId)
      ? 'PENDING'
      : 'PURCHASER_REVIEW',
  };
}

function selfApprovalEvents(access: RequestAccess, purchaserId: string) {
  if (!isSelfPurchased(access, purchaserId)) return [];
  return [
    {
      type: 'PURCHASER_APPROVED' as const,
      actorId: access.user.id,
      note: 'The requester is the purchaser.',
    },
  ];
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
  request: { purchaserId: string },
  title: string,
  note?: string | null,
): Notice[] {
  if (request.purchaserId === access.user.id) return [];
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

// A new or edited request goes to the purchaser, or straight to the
// Comptroller when the requester is the purchaser.
function submittedNotices(
  access: RequestAccess,
  status: PurchaseRequestStatus,
  purchaserId: string,
  title: string,
): Notice[] {
  return status === 'PENDING'
    ? comptrollerNotice(access, `${title}, ready for review`)
    : purchaserNotice(
        access,
        { purchaserId },
        `${title}, needs your approval as purchaser`,
      );
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

async function sendToEmail(
  email: string | null,
  label: string,
  text: string,
): Promise<SlackResult> {
  if (!email)
    return { ok: false, error: `The ${label.toLowerCase()} has no email.` };
  return sendSlackMessageToEmail(email, text);
}

async function sendToOfficeHolder(
  positionKey: string,
  label: string,
  text: string,
): Promise<SlackResult> {
  const email = await findOfficeHolderEmail(positionKey);
  if (!email)
    return {
      ok: false,
      error: `No one holding the ${label} position has signed in to VaultZ yet.`,
    };
  return sendSlackMessageToEmail(email, text);
}

const NOTICE_LABELS: Record<Notice['to'], string> = {
  comptroller: 'Comptroller',
  vpoa: 'VPOA',
  requester: 'Requester',
  purchaser: 'Purchaser',
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
        requester: { select: { ...personSelect, email: true } },
        purchaser: { select: { ...personSelect, email: true } },
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
      const result =
        notice.to === 'comptroller'
          ? await sendToOfficeHolder(COMPTROLLER, 'Comptroller', text)
          : notice.to === 'vpoa'
            ? await sendToOfficeHolder(VPOA, 'VPOA', text)
            : await sendToEmail(
                notice.to === 'requester'
                  ? request.requester.email
                  : request.purchaser.email,
                label,
                text,
              );
      if (!result.ok)
        await prisma.purchaseRequestEvent.create({
          data: {
            requestId,
            type: 'NOTIFY_FAILED',
            note: `${label}: ${result.error}`,
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
  const result = await sendToOfficeHolder(VPOA, 'VPOA', text);

  await prisma.$transaction([
    prisma.purchaseRequest.update({
      where: { id: request.id },
      data: result.ok
        ? { escalationNotifiedAt: new Date(), escalationNotifyError: null }
        : { escalationNotifyError: result.error },
    }),
    prisma.purchaseRequestEvent.create({
      data: {
        requestId: request.id,
        type: result.ok ? 'NOTIFIED' : 'NOTIFY_FAILED',
        note: result.ok ? null : result.error,
        actorId: access.user.id,
      },
    }),
  ]);

  return result.ok;
}
