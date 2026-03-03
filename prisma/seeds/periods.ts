import { PrismaClient, Year } from '../client';

// All periods are defined relative to the fiscal year start (July 1 of syear → June 30 of syear+1).
// We pick a random subset of 2 or 3 from the four available periods per year.
const periodPool: Array<{
  name: string;
  start: (syear: number) => Date;
  end: (syear: number) => Date;
}> = [
  {
    name: 'Fall',
    start: (y) => new Date(y, 6, 1), // Jul 1
    end: (y) => new Date(y, 10, 30), // Nov 30
  },
  {
    name: 'Winter',
    start: (y) => new Date(y, 11, 1), // Dec 1
    end: (y) => new Date(y + 1, 1, 28), // Feb 28
  },
  {
    name: 'Spring',
    start: (y) => new Date(y + 1, 2, 1), // Mar 1
    end: (y) => new Date(y + 1, 4, 31), // May 31
  },
  {
    name: 'Summer',
    start: (y) => new Date(y + 1, 5, 1), // Jun 1
    end: (y) => new Date(y + 1, 5, 30), // Jun 30
  },
];

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function seedPeriods(prisma: PrismaClient, years: Year[]) {
  const allPeriods = await Promise.all(
    years.flatMap((year) => {
      // syear = the calendar year in which the FY begins (July 1)
      const syear = year.startDate.getFullYear();
      // Randomly pick 2 or 3 periods from the pool
      const count = Math.random() < 0.5 ? 3 : 2;
      const selected = shuffled(periodPool).slice(0, count);
      // Re-sort by start date so ordering is chronological
      selected.sort(
        (a, b) => a.start(syear).getTime() - b.start(syear).getTime(),
      );

      return selected.map((t) =>
        prisma.period.create({
          data: {
            name: t.name,
            startDate: t.start(syear),
            endDate: t.end(syear),
            yearId: year.id,
          },
        }),
      );
    }),
  );
  console.log(`Seeded ${allPeriods.length} periods.`);
  return allPeriods;
}
