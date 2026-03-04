'use client';

import { ContextGuard } from '@/components/context-guard';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ContextGuard />
      {children}
    </>
  );
}
