import { Designation, PrismaClient } from '../client';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const budgetCategoryPool = [
  'Office Supplies',
  'Software Licenses',
  'Travel Expenses',
  'Training Materials',
  'Equipment',
  'Furniture',
  'Research and Development',
  'Marketing Materials',
  'Utilities',
  'Maintenance and Repairs',
];

const cashCategoryPool = [
  'Meals and Entertainment',
  'Transportation',
  'Miscellaneous',
  'Printing and Postage',
  'Petty Cash',
  'Event Supplies',
  'Gift Cards',
];

export type CategoryData = { code: string; ledgerCode: string; name: string };

// Randomly selects a subset of categories from the pools and assigns sequential
// codes and ledger codes. The count varies each run (4–8 budget, 3–6 cash).
export function generateCategoryData(): {
  budgetCategoryData: CategoryData[];
  cashCategoryData: CategoryData[];
} {
  const budgetCount = randomInt(4, 8);
  const cashCount = randomInt(3, 6);

  const budgetNames = shuffle(budgetCategoryPool).slice(0, budgetCount);
  const cashNames = shuffle(cashCategoryPool).slice(0, cashCount);

  const budgetCategoryData: CategoryData[] = budgetNames.map((name, i) => ({
    code: String(i + 1).padStart(3, '0'),
    ledgerCode: String(7000 + i + 1),
    name,
  }));

  const cashStart = budgetCategoryData.length + 1;
  const cashCategoryData: CategoryData[] = cashNames.map((name, i) => ({
    code: String(cashStart + i).padStart(3, '0'),
    ledgerCode: String(7000 + cashStart + i),
    name,
  }));

  return { budgetCategoryData, cashCategoryData };
}

export async function seedCategories(
  prisma: PrismaClient,
  designations: Designation[],
  budgetCategoryData: CategoryData[],
  cashCategoryData: CategoryData[],
  tick: (label: string) => void,
) {
  const budget = designations.find((d) => d.name === 'Budget')!;
  const cash = designations.find((d) => d.name === 'Cash')!;

  const budgetCategories = await Promise.all(
    budgetCategoryData.map((data) =>
      prisma.category
        .create({ data: { ...data, designationId: budget.id } })
        .then((c) => {
          tick('Seeding categories');
          return c;
        }),
    ),
  );

  const cashCategories = await Promise.all(
    cashCategoryData.map((data) =>
      prisma.category
        .create({ data: { ...data, designationId: cash.id } })
        .then((c) => {
          tick('Seeding categories');
          return c;
        }),
    ),
  );

  return [...budgetCategories, ...cashCategories];
}
