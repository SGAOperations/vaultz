import cliProgress from 'cli-progress';

import { PrismaClient } from './client';
import { seedAllocationGroups } from './seeds/allocationGroups';
import { seedAllocations } from './seeds/allocations';
import { seedCategories, generateCategoryData } from './seeds/categories';
import {
  seedCategoryYears,
  generateActiveCategoryCodesByYear,
  categoryYearsCount,
} from './seeds/categoryYears';
import { seedDesignations } from './seeds/designations';
import { generatePeriodSlots, seedPeriods } from './seeds/periods';
import { seedProcessTemplates } from './seeds/processTemplates';
import {
  generateProcessPlans,
  seedPurchaseProcesses,
} from './seeds/purchaseProcesses';
import { generatePurchaseCounts, seedPurchases } from './seeds/purchases';
import { generateTransferCounts, seedTransfers } from './seeds/transfers';
import { seedUsers } from './seeds/users';
import { seedYears, fiscalYearNames } from './seeds/years';

// Fixed entry counts derived directly from the seed data definitions.
const USERS = 10; // firstNames.length
const DESIGNATIONS = 2; // Budget + Cash
const YEARS = 3; // FY 23, 24, 25
const ALLOCATION_GROUPS = 7; // 4 budget + 3 cash
// Per period: 4 budget groups × 2 + 1 ungrouped budget + 3 cash groups × 1 + 1 ungrouped cash = 13
const ALLOCATIONS_PER_PERIOD = 13;
const PROCESS_TEMPLATES = 5;
const PROCESS_STEPS = 4 + 3 + 5 + 8 + 2; // 22 — one array per templateDefinitions entry
// Step counts in the same order as templateDefinitions for process plan generation
const TEMPLATE_STEP_COUNTS = [4, 3, 5, 8, 2];

// Pre-generate all random selections before opening the progress bar so the
// exact total is known upfront and the bar never needs to be adjusted.
const { budgetCategoryData, cashCategoryData } = generateCategoryData();
const allCategoryData = [...budgetCategoryData, ...cashCategoryData];
const CATEGORIES = allCategoryData.length;

const activeCategoryCodesByYear = generateActiveCategoryCodesByYear(
  allCategoryData,
  fiscalYearNames,
);
const CATEGORY_YEARS = categoryYearsCount(activeCategoryCodesByYear);

const periodSlots = generatePeriodSlots(YEARS);
const periodsCount = periodSlots.reduce((sum, s) => sum + s.length, 0);

const purchaseCounts = generatePurchaseCounts(
  allCategoryData,
  fiscalYearNames,
  activeCategoryCodesByYear,
);
const purchasesCount = purchaseCounts.reduce((a, b) => a + b, 0);

const processPlans = generateProcessPlans(purchasesCount, TEMPLATE_STEP_COUNTS);
const processesCount = processPlans.length;
const stepCompletionsCount = processPlans.reduce(
  (sum, p) => sum + p.stepCutoff,
  0,
);

const transferCounts = generateTransferCounts(DESIGNATIONS, YEARS);
const transfersCount = transferCounts.reduce((a, b) => a + b, 0);

const TOTAL =
  USERS +
  DESIGNATIONS +
  CATEGORIES +
  YEARS +
  periodsCount +
  CATEGORY_YEARS +
  ALLOCATION_GROUPS +
  ALLOCATIONS_PER_PERIOD * periodsCount +
  purchasesCount +
  PROCESS_TEMPLATES +
  PROCESS_STEPS +
  processesCount +
  stepCompletionsCount +
  transfersCount;

const prisma = new PrismaClient();

async function main() {
  // Check if data already exists, if so abandon seeding
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Database already contains data. Seeding abandoned.');
    return;
  }

  const bar = new cliProgress.SingleBar({
    format:
      '[{bar}] {percentage}% | {value}/{total} entries | {task} | ETA: ~{eta}s',
    barCompleteChar: '=',
    barIncompleteChar: '-',
    hideCursor: true,
  });

  bar.start(TOTAL, 0, { task: 'Starting...' });
  const tick = (task: string) => bar.increment({ task });

  const users = await seedUsers(prisma, tick);
  const designations = await seedDesignations(prisma, tick);
  const categories = await seedCategories(
    prisma,
    designations,
    budgetCategoryData,
    cashCategoryData,
    tick,
  );
  const years = await seedYears(prisma, tick);
  const periods = await seedPeriods(prisma, years, periodSlots, tick);
  await seedCategoryYears(prisma, categories, years, activeCategoryCodesByYear, tick);
  const allocationGroups = await seedAllocationGroups(
    prisma,
    designations,
    tick,
  );
  const allocations = await seedAllocations(
    prisma,
    designations,
    allocationGroups,
    periods,
    tick,
  );
  const purchases = await seedPurchases(
    prisma,
    categories,
    allocations,
    users,
    years,
    periods,
    purchaseCounts,
    tick,
  );
  const processTemplates = await seedProcessTemplates(prisma, tick);
  await seedPurchaseProcesses(
    prisma,
    purchases,
    processTemplates,
    processPlans,
    tick,
  );
  await seedTransfers(
    prisma,
    categories,
    years,
    transferCounts,
    activeCategoryCodesByYear,
    tick,
  );

  bar.stop();
  console.log('\nDatabase seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
