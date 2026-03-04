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

// Pre-generate how many transfers to create per (year × designation) pair.
// Pairs are ordered: for each year index yi, for each designation index di → index = yi * designationCount + di.
// Designation order is determined by first-encounter when iterating categories.
export function generateTransferCounts(
  designationCount: number,
  yearCount: number,
): number[] {
  return Array.from(
    { length: designationCount * yearCount },
    () => randomInt(3, 6),
  );
}

export async function seedTransfers(
  prisma: PrismaClient,
  categories: Category[],
  years: Year[],
  counts: number[],
  tick: (label: string) => void,
) {
  const allTransfers = [];

  for (let yi = 0; yi < years.length; yi++) {
    const year = years[yi];
    // Group categories by designation so transfers stay within the same designation
    const byDesignation = new Map<string, Category[]>();
    for (const cat of categories) {
      if (!byDesignation.has(cat.designationId))
        byDesignation.set(cat.designationId, []);
      byDesignation.get(cat.designationId)!.push(cat);
    }

    let di = 0;
    for (const [, designationCategories] of byDesignation) {
      if (designationCategories.length < 2) {
        di++;
        continue;
      }

      const transferCount = counts[yi * byDesignation.size + di];
      di++;

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
        tick('Seeding transfers');
      }
    }
  }

  return allTransfers;
}
