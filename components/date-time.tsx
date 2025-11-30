'use client';

import dynamic from 'next/dynamic';

export const DateTime = dynamic(
  () =>
    Promise.resolve(
      ({ date, dateOnly = false }: { date: Date; dateOnly?: boolean }) => (
        <span suppressHydrationWarning>
          {dateOnly ? date.toLocaleDateString() : date.toLocaleString()}
        </span>
      ),
    ),
  { ssr: false },
);
