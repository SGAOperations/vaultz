import cliProgress from 'cli-progress';
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
      '[{bar}] {percentage}% | Step {value}/{total}: {task} | Elapsed: {duration}s | ETA: ~{eta}s',
    barCompleteChar: '=',
    barIncompleteChar: '-',
    hideCursor: true,
  });

  bar.start(TOTAL_STEPS, 0, { task: 'Starting...' });

  const users = await seedUsers(prisma);
  bar.increment({ task: 'Seeded users' });

  const designations = await seedDesignations(prisma);
  bar.increment({ task: 'Seeded designations' });

  const categories = await seedCategories(prisma, designations);
  bar.increment({ task: 'Seeded categories' });

  const years = await seedYears(prisma);
  bar.increment({ task: 'Seeded years' });

  const periods = await seedPeriods(prisma, years);
  bar.increment({ task: 'Seeded periods' });

  await seedCategoryYears(prisma, categories, years);
  bar.increment({ task: 'Seeded category years' });

  const allocationGroups = await seedAllocationGroups(prisma, designations);
  bar.increment({ task: 'Seeded allocation groups' });

  const allocations = await seedAllocations(
    prisma,
    designations,
    allocationGroups,
    periods,
  );
  bar.increment({ task: 'Seeded allocations' });

  const purchases = await seedPurchases(
    prisma,
    categories,
    allocations,
    users,
    years,
    periods,
  );
  bar.increment({ task: 'Seeded purchases' });

  const processTemplates = await seedProcessTemplates(prisma);
  bar.increment({ task: 'Seeded process templates' });

  await seedPurchaseProcesses(prisma, purchases, processTemplates);
  bar.increment({ task: 'Seeded purchase processes' });

  await seedTransfers(prisma, categories, years);
  bar.increment({ task: 'Seeded transfers' });

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
