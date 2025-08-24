import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ModeToggle, ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
      <body className={cn('antialiased w-full font-sans', inter.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="mx-auto flex w-full flex-col items-center 2xl:w-4/5">
            <div className="p-2 mb-2 flex justify-between w-full">
              <Link href={'/'}>
                <h1 className="text-3xl font-bold">VaultZ</h1>
              </Link>
              <ModeToggle />
            </div>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
