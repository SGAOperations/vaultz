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
} from '@/lib/permissions';
import prisma from '@/lib/prisma';
import {
  AllocationBudget,
  OPEN_REQUEST_STATUSES,
  PurchaseRequestInput,
  computeAllocationBudget,
  purchaseRequestInputSchema,
} from '@/lib/purchase-request';
import { appOrigin } from '@/lib/sgauth';
import {
  escapeSlackText,
  sendSlackMessageTo,
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
  };
}

function canSee(access: RequestAccess, requesterId: string): boolean {
  return access.canView || requesterId === access.user.id;
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

  const [allocation, category, purchaser] = await Promise.all([
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
  ]);

  if (!allocation || !canUseDivision(access, allocation.allocationGroupId))
    return { error: 'You cannot request against that allocation.' };
  if (!category || category.designationId !== allocation.designationId)
    return { error: "That category does not belong to the allocation's fund." };
  if (!purchaser)
    return { error: 'The purchaser must be an Executive Board member.' };

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
  if (!request || !canSee(access, request.requesterId))
    return { error: 'Purchase request not found.' };

  const allowed = allowedRequestActions({
    session: access.session,
    status: request.status,
    isOwner: request.requesterId === access.user.id,
  });
  if (!allowed.includes(action))
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
      ...(onlyMine && { requesterId: access.user.id }),
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
      events: {
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: personSelect } },
      },
    },
  });
  if (!request || !canSee(access, request.requesterId)) return null;

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
    allowedActions: allowedRequestActions({
      session: access.session,
      status: request.status,
      isOwner: request.requesterId === access.user.id,
    }),
    budget,
  };
}

export async function getRequestFormOptions(): Promise<RequestFormOptions> {
  const access = await requireSubmitAccess();

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

  const [groups, purchasers] = await Promise.all([
    year
      ? prisma.allocationGroup.findMany({
          where:
            access.divisionIds === 'all'
              ? undefined
              : { id: { in: access.divisionIds } },
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
  ]);

  return {
    year,
    purchasers,
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
): Promise<ResponseType<{ id: string }>> {
  const access = await requireSubmitAccess();
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
      categoryId: data.categoryId,
      allocationId: data.allocationId,
      yearId,
      events: { create: { type: 'SUBMITTED', actorId: access.user.id } },
    },
    select: { id: true },
  });

  await queueNotices(
    access,
    request.id,
    comptrollerNotice(access, 'New purchase request'),
  );
  revalidateRequest();
  return request;
}

export async function updatePurchaseRequest(
  id: string,
  input: PurchaseRequestInput,
): Promise<ResponseType<{ id: string }>> {
  const loaded = await loadForAction(id, 'edit');
  if ('error' in loaded) return loaded;
  const { access } = loaded;

  const validated = await validateInput(access, input);
  if ('error' in validated) return validated;
  const { data, yearId } = validated;

  const ok = await prisma.$transaction((tx) =>
    transition(tx, {
      id,
      from: 'PENDING',
      event: 'EDITED',
      actorId: access.user.id,
      data: {
        description: data.description,
        amount: new Decimal(data.amount),
        notes: data.notes || null,
        attachments: data.attachments,
        purchaserId: data.purchaserId,
        categoryId: data.categoryId,
        allocationId: data.allocationId,
        yearId,
      },
    }),
  );
  if (!ok) return STALE_ERROR;

  await queueNotices(
    access,
    id,
    comptrollerNotice(access, 'Purchase request edited'),
  );
  revalidateRequest(id);
  return { id };
}

export async function cancelPurchaseRequest(
  id: string,
): Promise<ResponseType<{ id: string }>> {
  const loaded = await loadForAction(id, 'cancel');
  if ('error' in loaded) return loaded;

  const ok = await prisma.$transaction((tx) =>
    transition(tx, {
      id,
      from: 'PENDING',
      event: 'CANCELLED',
      actorId: loaded.access.user.id,
      data: { status: 'CANCELLED' },
    }),
  );
  if (!ok) return STALE_ERROR;

  await queueNotices(
    loaded.access,
    id,
    comptrollerNotice(loaded.access, 'Purchase request cancelled'),
  );
  revalidateRequest(id);
  return { id };
}

export async function approvePurchaseRequest({
  id,
  note,
  processTemplateId,
}: {
  id: string;
  note?: string;
  processTemplateId?: string;
}): Promise<ResponseType<{ id: string; purchaseId: string }>> {
  const loaded = await loadForAction(id, 'approve');
  if ('error' in loaded) return loaded;
  const { access, request } = loaded;

  if (processTemplateId) {
    const template = await prisma.processTemplate.findFirst({
      where: { id: processTemplateId, deletedAt: null },
      select: { id: true },
    });
    if (!template) return { error: 'That process template no longer exists.' };
  }

  const now = new Date();
  const purchaseId = await prisma.$transaction(async (tx) => {
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
      },
    });
    if (!ok) return null;

    // The request keeps the requested amount; the purchase is edited later if
    // the actual amount or date differs.
    const purchase = await tx.purchase.create({
      data: {
        userId: request.purchaserId,
        categoryId: request.categoryId,
        allocationId: request.allocationId,
        yearId: request.yearId,
        description: request.description,
        amount: request.amount,
        notes: request.notes,
        purchasedAt: now,
        receipts: [],
        ...(processTemplateId && {
          process: {
            create: { templateId: processTemplateId, startedAt: now },
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

  await queueNotices(
    access,
    id,
    decisionNotices(access, request, 'approved', note),
  );
  revalidateRequest(id);
  revalidatePath('/');
  revalidatePath('/purchases');
  return { id, purchaseId };
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
  'id' | 'description' | 'amount' | 'allocation' | 'requester' | 'purchaser'
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
): string {
  const division = request.allocation.allocationGroup?.name ?? 'No division';
  return [
    headline,
    `*${escapeSlackText(request.description)}*: ${formatCurrency(request.amount.toNumber())}`,
    `Division: ${escapeSlackText(division)} · ${escapeSlackText(request.allocation.name)}`,
    `Requested by ${personName(request.requester)} · Purchaser ${personName(request.purchaser)}`,
    ...(note ? [`Note: ${escapeSlackText(note)}`] : []),
    `<${url}|View in VaultZ>`,
  ].join('\n');
}

interface Notice {
  to: 'comptroller' | 'requester';
  headline: string;
  note?: string | null;
}

// The Comptroller hears about requester activity, except their own.
function comptrollerNotice(access: RequestAccess, title: string): Notice[] {
  if (hasAnyPosition(access.session, [COMPTROLLER])) return [];
  return [
    { to: 'comptroller', headline: `*${title}* by ${personName(access.user)}` },
  ];
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
  if (request.requesterId !== access.user.id)
    notices.push({
      to: 'requester',
      headline: `*Your purchase request was ${verb}* by ${personName(access.user)}`,
      note,
    });
  return notices;
}

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
      },
    });
    if (!request) return;

    for (const notice of notices) {
      const text = requestMessage(notice.headline, request, url, notice.note);
      const email = request.requester.email;
      const result =
        notice.to === 'comptroller'
          ? await sendSlackMessageTo('comptroller', text)
          : email
            ? await sendSlackMessageToEmail(email, text)
            : { ok: false as const, error: 'The requester has no email.' };
      if (!result.ok)
        await prisma.purchaseRequestEvent.create({
          data: {
            requestId,
            type: 'NOTIFY_FAILED',
            note: `${notice.to === 'comptroller' ? 'Comptroller' : 'Requester'}: ${result.error}`,
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
  const result = await sendSlackMessageTo('vpoa', text);

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
