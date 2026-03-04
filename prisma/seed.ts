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
import { seedUsers } from './seeds/users';
import { seedYears } from './seeds/years';

const prisma = new PrismaClient();

async function main() {
  // Check if data already exists, if so abandon seeding
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Database already contains data. Seeding abandoned.');
    return;
  }

  const users = await seedUsers(prisma);
  const designations = await seedDesignations(prisma);
  const categories = await seedCategories(prisma, designations);
  const years = await seedYears(prisma);
  const periods = await seedPeriods(prisma, years);
  await seedCategoryYears(prisma, categories, years);
  const allocationGroups = await seedAllocationGroups(prisma, designations);
  const allocations = await seedAllocations(
    prisma,
    designations,
    allocationGroups,
    periods,
  );
  const purchases = await seedPurchases(
    prisma,
    categories,
    allocations,
    users,
    years,
    periods,
  );
  const processTemplates = await seedProcessTemplates(prisma);
  await seedPurchaseProcesses(prisma, purchases, processTemplates);

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
