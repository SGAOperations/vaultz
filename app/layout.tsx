import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ModeToggle, ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SGA Finance Master",
  description: "A financial administration tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "antialiased w-full 2xl:w-4/5 font-sans mx-auto",
          inter.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="p-2 mb-2 flex justify-between">
            <h1 className="text-2xl">SGA Finance Master</h1>
            <ModeToggle />
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
