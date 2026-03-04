import { PrismaClient } from './client';
import { seedAllocationGroups } from './seeds/allocationGroups';
import { seedAllocations } from './seeds/allocations';
import { seedCategories } from './seeds/categories';
import { seedCategoryYears } from './seeds/categoryYears';
import { seedDesignations } from './seeds/designations';
import { seedPeriods } from './seeds/periods';
import { seedProcessTemplates } from './seeds/processTemplates';
import { seedPurchaseProcesses } from './seeds/purchaseProcesses';
import { seedPurchases } from './seeds/purchases';
import { seedTransfers } from './seeds/transfers';
import { seedUsers } from './seeds/users';
import { seedYears } from './seeds/years';

const TOTAL_STEPS = 12;
const BAR_WIDTH = 25;

let currentStep = 0;
let seedStartTime = 0;

function printProgress(label: string) {
  currentStep++;

  const pct = Math.round((currentStep / TOTAL_STEPS) * 100);
  const filled = Math.round((currentStep / TOTAL_STEPS) * BAR_WIDTH);
  const bar = '='.repeat(filled) + '-'.repeat(BAR_WIDTH - filled);

  const elapsedMs = Date.now() - seedStartTime;
  const elapsed = (elapsedMs / 1000).toFixed(1);
  const avgStepMs = elapsedMs / currentStep;
  const eta = ((avgStepMs * (TOTAL_STEPS - currentStep)) / 1000).toFixed(1);

  console.log(
    `[${bar}] ${String(pct).padStart(3)}% | Step ${currentStep}/${TOTAL_STEPS}: ${label} | Elapsed: ${elapsed}s | ETA: ~${eta}s`,
  );
}

const prisma = new PrismaClient();

async function main() {
  // Check if data already exists, if so abandon seeding
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Database already contains data. Seeding abandoned.');
    return;
  }

  seedStartTime = Date.now();
  console.log(`Starting database seeding (${TOTAL_STEPS} steps)...\n`);

  const users = await seedUsers(prisma);
  printProgress('Seeded users');

  const designations = await seedDesignations(prisma);
  printProgress('Seeded designations');

  const categories = await seedCategories(prisma, designations);
  printProgress('Seeded categories');

  const years = await seedYears(prisma);
  printProgress('Seeded years');

  const periods = await seedPeriods(prisma, years);
  printProgress('Seeded periods');

  await seedCategoryYears(prisma, categories, years);
  printProgress('Seeded category years');

  const allocationGroups = await seedAllocationGroups(prisma, designations);
  printProgress('Seeded allocation groups');

  const allocations = await seedAllocations(
    prisma,
    designations,
    allocationGroups,
    periods,
  );
  printProgress('Seeded allocations');

  const purchases = await seedPurchases(
    prisma,
    categories,
    allocations,
    users,
    years,
    periods,
  );
  printProgress('Seeded purchases');

  const processTemplates = await seedProcessTemplates(prisma);
  printProgress('Seeded process templates');

  await seedPurchaseProcesses(prisma, purchases, processTemplates);
  printProgress('Seeded purchase processes');

  await seedTransfers(prisma, categories, years);
  printProgress('Seeded transfers');

  const totalTime = ((Date.now() - seedStartTime) / 1000).toFixed(1);
  console.log(`\nDatabase seeding completed successfully in ${totalTime}s.`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
