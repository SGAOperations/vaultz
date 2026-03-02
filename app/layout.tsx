import { NextSSRPlugin } from '@uploadthing/react/next-ssr-plugin';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { extractRouterConfig } from 'uploadthing/server';

import './globals.css';

import { receiptFileRouter } from '@/app/api/uploadthing/core';

import { getDesignations } from '@/prisma/services/designation';
import {
  getActivePeriod,
  getActiveYear,
  getAllPeriods,
  getAllYears,
} from '@/prisma/services/period';

import { cn } from '@/lib/utils';

import { Header } from '@/components/header';
import { DesignationProviderWrapper } from '@/components/providers/designation-provider-wrapper';
import { PeriodProviderWrapper } from '@/components/providers/period-provider-wrapper';
import { QueryProvider } from '@/components/providers/query-provider';
import { YearProviderWrapper } from '@/components/providers/year-provider-wrapper';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ variable: '--font-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'VaultZ', template: 'VaultZ - %s' },
  description: 'A financial administration tool.',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [designations, years, activeYear, periods, activePeriod] =
    await Promise.all([
      getDesignations(),
      getAllYears(),
      getActiveYear(),
      getAllPeriods(),
      getActivePeriod(),
    ]);

  const initialDesignation = designations[0]
    ? {
        id: designations[0].id,
        name: designations[0].name,
        code: designations[0].code,
        budgetResetBehavior: designations[0].budgetResetBehavior,
      }
    : null;

  const activeYearId = activeYear?.id;
  const initialYearData = years.find((y) => y.id === activeYearId) ?? years[0] ?? null;
  const initialYear = initialYearData
    ? { id: initialYearData.id, name: initialYearData.name }
    : null;

  const activePeriodId = activePeriod?.id;
  const initialPeriodData =
    periods.find((p) => p.id === activePeriodId) ?? periods[0] ?? null;
  const initialPeriod = initialPeriodData
    ? { id: initialPeriodData.id, name: initialPeriodData.name }
    : null;

  return (
    <html lang="en">
      <body className={cn('w-full font-sans antialiased', inter.variable)}>
        <NextSSRPlugin routerConfig={extractRouterConfig(receiptFileRouter)} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <DesignationProviderWrapper initialDesignation={initialDesignation}>
              <YearProviderWrapper
                initialYear={initialYear}
                activeYearId={activeYearId}
              >
                <PeriodProviderWrapper
                  initialPeriod={initialPeriod}
                  activePeriodId={activePeriodId}
                >
                  <main className="mx-auto flex w-full flex-col items-center 2xl:w-4/5">
                    <div className="bg-background sticky top-0 z-50 w-full px-3 pt-3">
                      <Header />
                    </div>
                    <div className="w-full px-3 pb-3">{children}</div>
                  </main>
                  <Toaster
                    richColors
                    toastOptions={{
                      classNames: { description: 'line-clamp-2' },
                    }}
                  />
                </PeriodProviderWrapper>
              </YearProviderWrapper>
            </DesignationProviderWrapper>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
