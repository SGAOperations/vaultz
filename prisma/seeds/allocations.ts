import {
  Allocation,
  AllocationGroup,
  Designation,
  Period,
  PrismaClient,
} from '../client';

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

const budgetAllocationNames = [
  'Spring Tabling',
  'Fall Tabling',
  'Green Initiative',
  'Recycling Program',
  'Social Media Campaign',
  'Print Materials',
  'Innovation Grant',
  'Pilot Program',
  'General Operations',
];

const cashAllocationNames = [
  'Food Bank Support',
  'Volunteer Events',
  'Annual Gala',
  'Workshop Series',
  'Welcome Reception',
  'Holiday Party',
  'Emergency Fund',
];

export async function seedAllocations(
  prisma: PrismaClient,
  designations: Designation[],
  allocationGroups: AllocationGroup[],
  periods: Period[],
): Promise<Allocation[]> {
  const budget = designations.find((d) => d.name === 'Budget')!;
  const cash = designations.find((d) => d.name === 'Cash')!;

  const budgetGroups = allocationGroups.filter(
    (g) => g.designationId === budget.id,
  );
  const cashGroups = allocationGroups.filter(
    (g) => g.designationId === cash.id,
  );

  const allAllocations: Allocation[] = [];

  for (const period of periods) {
    // Grouped budget allocations: 2 per group, cycling through names
    for (const group of budgetGroups) {
      for (let i = 0; i < 2; i++) {
        const nameIdx =
          (budgetGroups.indexOf(group) * 2 + i) % budgetAllocationNames.length;
        allAllocations.push(
          await prisma.allocation.create({
            data: {
              name: `${budgetAllocationNames[nameIdx]} (${period.name})`,
              amount: randomAmount(300, 1500),
              designationId: budget.id,
              allocationGroupId: group.id,
              periodId: period.id,
            },
          }),
        );
      }
    }

    // Ungrouped budget allocation
    allAllocations.push(
      await prisma.allocation.create({
        data: {
          name: `General Operations (${period.name})`,
          amount: randomAmount(500, 2000),
          designationId: budget.id,
          periodId: period.id,
        },
      }),
    );

    // Grouped cash allocations: 1 per group
    for (const group of cashGroups) {
      const nameIdx = cashGroups.indexOf(group) % cashAllocationNames.length;
      allAllocations.push(
        await prisma.allocation.create({
          data: {
            name: `${cashAllocationNames[nameIdx]} (${period.name})`,
            amount: randomAmount(200, 1000),
            designationId: cash.id,
            allocationGroupId: group.id,
            periodId: period.id,
          },
        }),
      );
    }

    // Ungrouped cash allocation
    allAllocations.push(
      await prisma.allocation.create({
        data: {
          name: `Emergency Fund (${period.name})`,
          amount: randomAmount(300, 800),
          designationId: cash.id,
          periodId: period.id,
        },
      }),
    );
  }

  console.log(`Seeded ${allAllocations.length} allocations.`);
  return allAllocations;
}
