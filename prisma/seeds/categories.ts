import { Designation, PrismaClient } from '../client';

const budgetCategoryData = [
  { code: 'SC001', ledgerCode: '7001', name: 'Office Supplies' },
  { code: 'SC002', ledgerCode: '7002', name: 'Software Licenses' },
  { code: 'SC003', ledgerCode: '7003', name: 'Travel Expenses' },
  { code: 'SC004', ledgerCode: '7004', name: 'Training Materials' },
  { code: 'SC005', ledgerCode: '7005', name: 'Equipment' },
  { code: 'SC006', ledgerCode: '7006', name: 'Furniture' },
];

const cashCategoryData = [
  { code: 'SC007', ledgerCode: '7007', name: 'Meals and Entertainment' },
  { code: 'SC008', ledgerCode: '7008', name: 'Transportation' },
  { code: 'SC009', ledgerCode: '7009', name: 'Miscellaneous' },
  { code: 'SC010', ledgerCode: '7010', name: 'Printing and Postage' },
];

export async function seedCategories(
  prisma: PrismaClient,
  designations: Designation[],
) {
  const budget = designations.find((d) => d.name === 'Budget')!;
  const cash = designations.find((d) => d.name === 'Cash')!;

  const budgetCategories = await Promise.all(
    budgetCategoryData.map((data) =>
      prisma.category.create({ data: { ...data, designationId: budget.id } }),
    ),
  );

  const cashCategories = await Promise.all(
    cashCategoryData.map((data) =>
      prisma.category.create({ data: { ...data, designationId: cash.id } }),
    ),
  );

  const categories = [...budgetCategories, ...cashCategories];
  console.log(`Seeded ${categories.length} categories.`);
  return categories;
}
