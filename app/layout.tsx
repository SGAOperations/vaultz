import { NextSSRPlugin } from '@uploadthing/react/next-ssr-plugin';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { extractRouterConfig } from 'uploadthing/server';

import './globals.css';

import { receiptFileRouter } from '@/app/api/uploadthing/core';

import { cn } from '@/lib/utils';

import { Header } from '@/components/header';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ variable: '--font-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'VaultZ', template: 'VaultZ - %s' },
  description: 'A financial administration tool.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
          <main className="mx-auto flex w-full flex-col items-center p-3 2xl:w-4/5">
            <Header />
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
