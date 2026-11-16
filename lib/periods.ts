import { parseDateOnly } from '@/lib/utils';

interface DatedPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
}

// The period to show by default: the one covering today, else the latest
// that has started, else the first. Periods must be sorted by start date.
export function defaultPeriodId(
  periods: DatedPeriod[],
  today: Date = new Date(),
): string | undefined {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const current = periods.find(
    (p) => parseDateOnly(p.startDate) <= day && day <= parseDateOnly(p.endDate),
  );
  if (current) return current.id;
  const started = periods.filter((p) => parseDateOnly(p.startDate) <= day);
  return (started.at(-1) ?? periods[0])?.id;
}
