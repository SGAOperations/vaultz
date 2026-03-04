import { Category, PrismaClient, Year } from '../client';

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const transferNotes = [
  'Reallocating surplus funds',
  'Budget adjustment for Q4',
  'Covering overspend in destination category',
  'Year-end rebalancing',
  'Approved transfer per finance review',
  'Offsetting unexpected expense',
  'Consolidating unused budget',
  null,
];

export async function seedTransfers(
  prisma: PrismaClient,
  categories: Category[],
  years: Year[],
) {
  const allTransfers = [];

  for (const year of years) {
    // Group categories by designation so transfers stay within the same designation
    const byDesignation = new Map<string, Category[]>();
    for (const cat of categories) {
      if (!byDesignation.has(cat.designationId))
        byDesignation.set(cat.designationId, []);
      byDesignation.get(cat.designationId)!.push(cat);
    }

    for (const [, designationCategories] of byDesignation) {
      if (designationCategories.length < 2) continue;

      const transferCount = randomInt(3, 6);
      for (let i = 0; i < transferCount; i++) {
        const fromCategory = randomPick(designationCategories);
        const toOptions = designationCategories.filter(
          (c) => c.id !== fromCategory.id,
        );
        const toCategory = randomPick(toOptions);
        const notes = randomPick(transferNotes);

        allTransfers.push(
          await prisma.transfer.create({
            data: {
              amount: randomAmount(50, 500),
              notes,
              fromCategoryId: fromCategory.id,
              toCategoryId: toCategory.id,
              yearId: year.id,
            },
          }),
        );
      }
    }
  }

  console.log(`Seeded ${allTransfers.length} transfers.`);
  return allTransfers;
}
