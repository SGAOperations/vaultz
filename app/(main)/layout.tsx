'use client';

import { redirect, usePathname } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';
import { useYear } from '@/contexts/YearContext';

const SETUP_PATHS = ['/designation', '/periods'];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { designations } = useDesignation();
  const { years } = useYear();

  const isSetupPage = SETUP_PATHS.some((p) => pathname.startsWith(p));

  // Guard redirects in order of dependency: designation must exist before year is meaningful.
  // If both are missing, user will be redirected to /designation first, then /periods after
  // creating their first designation.
  if (!isSetupPage && designations.length === 0) redirect('/designation');
  if (!isSetupPage && years.length === 0) redirect('/periods');

  return <>{children}</>;
}
