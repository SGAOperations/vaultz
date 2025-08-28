'use client';

import dynamic from 'next/dynamic';

export const DateTime = dynamic(
  () =>
    Promise.resolve(({ date }: { date: Date }) => (
      <span suppressHydrationWarning>{date.toLocaleString()}</span>
    )),
  { ssr: false },
);
