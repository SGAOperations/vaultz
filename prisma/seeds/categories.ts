import { Designation, PrismaClient } from '../client';

export const budgetCategoryData = [
  { code: '001', ledgerCode: '7001', name: 'Office Supplies' },
  { code: '002', ledgerCode: '7002', name: 'Software Licenses' },
  { code: '003', ledgerCode: '7003', name: 'Travel Expenses' },
  { code: '004', ledgerCode: '7004', name: 'Training Materials' },
  { code: '005', ledgerCode: '7005', name: 'Equipment' },
  { code: '006', ledgerCode: '7006', name: 'Furniture' },
];

export const cashCategoryData = [
  { code: '007', ledgerCode: '7007', name: 'Meals and Entertainment' },
  { code: '008', ledgerCode: '7008', name: 'Transportation' },
  { code: '009', ledgerCode: '7009', name: 'Miscellaneous' },
  { code: '010', ledgerCode: '7010', name: 'Printing and Postage' },
];

export async function seedCategories(
  prisma: PrismaClient,
  designations: Designation[],
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
