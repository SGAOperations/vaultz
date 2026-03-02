import { PrismaClient } from '../client';

const fiscalYears = [
  {
    name: 'FY 23',
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31'),
  },
  {
    name: 'FY 24',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
  },
  {
    name: 'FY 25',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
  },
];

export async function seedYears(prisma: PrismaClient) {
  const years = await Promise.all(
    fiscalYears.map((data) => prisma.year.create({ data })),
  );
  console.log(`Seeded ${years.length} fiscal years.`);
  return years;
}
