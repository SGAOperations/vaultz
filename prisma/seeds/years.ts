import { PrismaClient } from '../client';

// Fiscal year convention: FY XX runs July 1 of the prior calendar year through June 30 of year XX.
// e.g. FY 23 = July 1, 2022 → June 30, 2023
const fiscalYears = [
  {
    name: 'FY 23',
    startDate: new Date('2022-07-01'),
    endDate: new Date('2023-06-30'),
  },
  {
    name: 'FY 24',
    startDate: new Date('2023-07-01'),
    endDate: new Date('2024-06-30'),
  },
  {
    name: 'FY 25',
    startDate: new Date('2024-07-01'),
    endDate: new Date('2025-06-30'),
  },
];

export async function seedYears(
  prisma: PrismaClient,
  tick: (label: string) => void,
) {
  const years = await Promise.all(
    fiscalYears.map((data) =>
      prisma.year.create({ data }).then((y) => {
        tick('Seeding years');
        return y;
      }),
    ),
  );
  return years;
}
