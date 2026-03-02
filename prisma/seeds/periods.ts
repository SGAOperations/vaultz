import { PrismaClient, Year } from '../client';

const periodTemplates = [
  {
    name: (fy: string) => `Spring ${fy}`,
    startMonth: 0,
    startDay: 1,
    endMonth: 3,
    endDay: 30,
  },
  {
    name: (fy: string) => `Summer ${fy}`,
    startMonth: 4,
    startDay: 1,
    endMonth: 7,
    endDay: 31,
  },
  {
    name: (fy: string) => `Fall ${fy}`,
    startMonth: 8,
    startDay: 1,
    endMonth: 11,
    endDay: 31,
  },
];

export async function seedPeriods(prisma: PrismaClient, years: Year[]) {
  const allPeriods = await Promise.all(
    years.flatMap((year) => {
      const calYear = year.startDate.getFullYear();
      return periodTemplates.map((t) =>
        prisma.period.create({
          data: {
            name: t.name(String(calYear)),
            startDate: new Date(calYear, t.startMonth, t.startDay),
            endDate: new Date(calYear, t.endMonth, t.endDay),
            yearId: year.id,
          },
        }),
      );
    }),
  );
  console.log(`Seeded ${allPeriods.length} periods.`);
  return allPeriods;
}
