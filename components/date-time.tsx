'use client';

import dynamic from 'next/dynamic';

import { parseDateOnly } from '@/lib/utils';

export const DateTime = dynamic(
  () =>
    Promise.resolve(
      ({ date, dateOnly = false }: { date: Date; dateOnly?: boolean }) => {
        // For date-only values, use parseDateOnly to avoid timezone issues
        const displayDate = dateOnly ? parseDateOnly(date) : date;
        return (
          <span suppressHydrationWarning>
            {dateOnly
              ? displayDate.toLocaleDateString()
              : displayDate.toLocaleString()}
          </span>
        );
      },
    ),
  { ssr: false },
);
