import { NextSSRPlugin } from '@uploadthing/react/next-ssr-plugin';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { extractRouterConfig } from 'uploadthing/server';

import './globals.css';

import { receiptFileRouter } from '@/app/api/uploadthing/core';

import { getFirstDesignation } from '@/prisma/services/designation';
import { getActivePeriod, getActiveYear } from '@/prisma/services/period';

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
  const [firstDesignation, activeYear, activePeriod] = await Promise.all([
    getFirstDesignation(),
    getActiveYear(),
    getActivePeriod(),
  ]);

  const initialDesignation = firstDesignation;
  const initialYear = activeYear
    ? { id: activeYear.id, name: activeYear.name }
    : null;
  const initialPeriod = activePeriod
    ? { id: activePeriod.id, name: activePeriod.name, yearName: activePeriod.year.name }
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
            <NuqsAdapter>
              <DesignationProviderWrapper
                initialDesignation={initialDesignation}
              >
                <YearProviderWrapper initialYear={initialYear}>
                  <PeriodProviderWrapper initialPeriod={initialPeriod}>
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
            </NuqsAdapter>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
