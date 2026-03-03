import { Designation, PrismaClient } from '../client';

const budgetGroupNames = [
  'Tabling Funds',
  'Sustainability',
  'Marketing',
  'Research & Development',
];

const cashGroupNames = ['Community Outreach', 'Events', 'Hospitality'];

export async function seedAllocationGroups(
  prisma: PrismaClient,
  designations: Designation[],
) {
  const budget = designations.find((d) => d.name === 'Budget')!;
  const cash = designations.find((d) => d.name === 'Cash')!;

  const budgetGroups = await Promise.all(
    budgetGroupNames.map((name) =>
      prisma.allocationGroup.create({
        data: { name, designationId: budget.id },
      }),
    ),
  );

  const cashGroups = await Promise.all(
    cashGroupNames.map((name) =>
      prisma.allocationGroup.create({ data: { name, designationId: cash.id } }),
    ),
  );

  const groups = [...budgetGroups, ...cashGroups];
  console.log(`Seeded ${groups.length} allocation groups.`);
  return groups;
}
