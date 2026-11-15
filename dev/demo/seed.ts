// Prepares the local purchase request demo database. Run by dev/demo/start.sh
// inside the demo container; safe to run more than once.
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { PURCHASER_RULE } from '../../lib/purchase-request';
import { PrismaClient } from '../../prisma/client';

interface Persona {
  key: string;
  sgauthUserId: string;
  name: string;
  email: string;
  positions: { key: string; name: string }[];
  eBoardPurchaser?: boolean;
}

const personas: Persona[] = JSON.parse(
  readFileSync(new URL('./personas.json', import.meta.url), 'utf8'),
);
const persona = (key: string) => {
  const found = personas.find((p) => p.key === key);
  if (!found) throw new Error(`Unknown demo persona ${key}`);
  return found;
};

// Which divisions (allocation groups) each requester position can use.
const DIVISION_ACCESS: Record<string, string[]> = {
  'vice-president-of-campus-affairs': ['Events', 'Marketing'],
  'vice-president-of-student-involvement': ['Events'],
  'director-of-campus-services': ['Marketing'],
};
const PURCHASING_METHODS = [
  'Reimbursement Process',
  'Expense Report',
  'Vendor Invoice',
];
const ACKNOWLEDGED = `Acknowledged: ${PURCHASER_RULE}`;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function ensureBaseData() {
  if ((await prisma.year.count()) > 0) return;
  console.log('Loading the regular seed data...');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
}

// Moves the latest fiscal year, and its periods, forward by whole years so it
// covers today and its allocations are open for requests.
async function ensureActiveYear() {
  const today = new Date();
  const active = await prisma.year.findFirst({
    where: {
      deletedAt: null,
      startDate: { lte: today },
      endDate: { gte: today },
    },
  });
  if (active) return active;

  const latest = await prisma.year.findFirstOrThrow({
    where: { deletedAt: null },
    orderBy: { endDate: 'desc' },
  });
  let years = 0;
  const end = new Date(latest.endDate);
  while (end < today) {
    end.setFullYear(end.getFullYear() + 1);
    years += 1;
  }
  await prisma.$executeRaw`UPDATE "Period" SET "startDate" = "startDate" + make_interval(years => ${years}), "endDate" = "endDate" + make_interval(years => ${years}) WHERE "yearId" = ${latest.id}`;
  await prisma.$executeRaw`UPDATE "Year" SET "startDate" = "startDate" + make_interval(years => ${years}), "endDate" = "endDate" + make_interval(years => ${years}) WHERE "id" = ${latest.id}`;
  return prisma.year.update({
    where: { id: latest.id },
    data: { name: `FY ${String(end.getFullYear()).slice(2)}` },
  });
}

async function ensurePersonas() {
  const now = new Date();
  for (const p of personas) {
    const [first, ...rest] = p.name.split(' ');
    const data = {
      first,
      last: rest.join(' '),
      email: p.email,
      isEBoardPurchaser: p.eBoardPurchaser ?? false,
      positionKeys: p.positions.map((x) => x.key),
      positionsChangedAt: now,
    };
    await prisma.user.upsert({
      where: { sgauthUserId: p.sgauthUserId },
      create: { ...data, sgauthUserId: p.sgauthUserId },
      update: data,
    });
  }
}

async function ensureAccess() {
  for (const [positionKey, divisionNames] of Object.entries(DIVISION_ACCESS)) {
    await prisma.requesterPosition.upsert({
      where: { positionKey },
      create: { positionKey },
      update: {},
    });
    const groups = await prisma.allocationGroup.findMany({
      where: { name: { in: divisionNames } },
      select: { id: true },
    });
    for (const group of groups)
      await prisma.positionDivisionAccess.upsert({
        where: {
          positionKey_allocationGroupId: {
            positionKey,
            allocationGroupId: group.id,
          },
        },
        create: { positionKey, allocationGroupId: group.id },
        update: {},
      });
  }

  const named = await prisma.processTemplate.findMany({
    where: { deletedAt: null, name: { in: PURCHASING_METHODS } },
    select: { id: true },
  });
  const methods =
    named.length > 0
      ? named
      : await prisma.processTemplate.findMany({
          where: { deletedAt: null },
          take: 3,
          select: { id: true },
        });
  await prisma.processTemplate.updateMany({
    where: { id: { in: methods.map((m) => m.id) } },
    data: { isPurchasingMethod: true },
  });
}

// Sample history is spread over the past few hours so it reads in order.
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

async function ensureSampleRequests(yearId: string) {
  if ((await prisma.purchaseRequest.count()) > 0) return;

  const users = Object.fromEntries(
    await Promise.all(
      ['riley', 'pat', 'casey'].map(async (key) => [
        key,
        await prisma.user.findUniqueOrThrow({
          where: { sgauthUserId: persona(key).sgauthUserId },
        }),
      ]),
    ),
  );
  const allocation = await prisma.allocation.findFirstOrThrow({
    where: {
      deletedAt: null,
      period: { yearId },
      allocationGroup: { name: 'Events' },
    },
    orderBy: { amount: 'desc' },
  });
  const category = await prisma.category.findFirstOrThrow({
    where: { deletedAt: null, designationId: allocation.designationId },
    orderBy: { code: 'asc' },
  });
  const method = await prisma.processTemplate.findFirstOrThrow({
    where: { deletedAt: null, isPurchasingMethod: true },
    orderBy: { name: 'asc' },
  });
  const base = {
    allocationId: allocation.id,
    categoryId: category.id,
    yearId,
    processTemplateId: method.id,
    attachments: [],
  };

  await prisma.purchaseRequest.create({
    data: {
      ...base,
      description: 'Banners for the involvement fair',
      amount: 120,
      notes: 'Two vinyl banners for the fall involvement fair table.',
      status: 'PURCHASER_REVIEW',
      requesterId: users.riley.id,
      purchaserId: users.pat.id,
      createdAt: hoursAgo(2),
      events: {
        create: [
          {
            type: 'SUBMITTED',
            actorId: users.riley.id,
            note: ACKNOWLEDGED,
            createdAt: hoursAgo(2),
          },
        ],
      },
    },
  });

  await prisma.purchaseRequest.create({
    data: {
      ...base,
      description: 'Catering for the town hall',
      amount: 260,
      notes: 'Light dinner for about 40 attendees.',
      status: 'PENDING',
      requesterId: users.riley.id,
      purchaserId: users.pat.id,
      createdAt: hoursAgo(5),
      events: {
        create: [
          {
            type: 'SUBMITTED',
            actorId: users.riley.id,
            note: ACKNOWLEDGED,
            createdAt: hoursAgo(5),
          },
          {
            type: 'PURCHASER_APPROVED',
            actorId: users.pat.id,
            createdAt: hoursAgo(4),
          },
        ],
      },
    },
  });

  const now = new Date();
  const purchase = await prisma.purchase.create({
    data: {
      userId: users.pat.id,
      categoryId: category.id,
      allocationId: allocation.id,
      yearId,
      description: 'Printing for the voter registration drive',
      amount: 85,
      purchasedAt: now,
      receipts: [],
      process: { create: { templateId: method.id, startedAt: now } },
    },
  });
  await prisma.purchaseRequest.create({
    data: {
      ...base,
      description: 'Printing for the voter registration drive',
      amount: 85,
      status: 'APPROVED',
      requesterId: users.pat.id,
      purchaserId: users.pat.id,
      decidedById: users.casey.id,
      decidedAt: now,
      decisionNote: 'Use the SGA card and keep the itemized receipt.',
      purchaseId: purchase.id,
      createdAt: hoursAgo(26),
      events: {
        create: [
          {
            type: 'SUBMITTED',
            actorId: users.pat.id,
            note: ACKNOWLEDGED,
            createdAt: hoursAgo(26),
          },
          {
            type: 'PURCHASER_APPROVED',
            actorId: users.pat.id,
            note: 'The requester is the purchaser.',
            createdAt: hoursAgo(26),
          },
          {
            type: 'APPROVED',
            actorId: users.casey.id,
            note: 'Use the SGA card and keep the itemized receipt.',
            createdAt: hoursAgo(1),
          },
        ],
      },
    },
  });
}

async function main() {
  await ensureBaseData();
  const year = await ensureActiveYear();
  await ensurePersonas();
  await ensureAccess();
  await ensureSampleRequests(year.id);
  console.log(`Demo data ready (active year ${year.name}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
