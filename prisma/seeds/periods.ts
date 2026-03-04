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

type PeriodPoolItem = (typeof periodPool)[number];

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Pre-generate which pool items each year will use (without needing year IDs).
// Returns one slot array per year; the slots are sorted during insertion.
export function generatePeriodSlots(yearCount: number): PeriodPoolItem[][] {
  return Array.from({ length: yearCount }, () => {
    const count = Math.random() < 0.5 ? 3 : 2;
    return shuffled(periodPool).slice(0, count);
  });
}

export type PeriodSlots = ReturnType<typeof generatePeriodSlots>;

export async function seedPeriods(
  prisma: PrismaClient,
  years: Year[],
  slots: PeriodSlots,
  tick: (label: string) => void,
) {
  const allPeriods = [];
  for (let yi = 0; yi < years.length; yi++) {
    const year = years[yi];
    const syear = year.startDate.getFullYear();
    const selected = [...slots[yi]].sort(
      (a, b) => a.start(syear).getTime() - b.start(syear).getTime(),
    );
    for (const t of selected) {
      allPeriods.push(
        await prisma.period.create({
          data: {
            name: t.name,
            startDate: t.start(syear),
            endDate: t.end(syear),
            yearId: year.id,
          },
        }),
      );
      tick('Seeding periods');
    }
  }
  return allPeriods;
}
