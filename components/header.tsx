'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FolderKanban, Home, Plus, User, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

import { ModeToggle } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserDialog } from '@/components/user-dialog';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/allocation-groups', label: 'Allocations', icon: FolderKanban },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-header-bg border-header-border mb-6 flex w-full items-center justify-between rounded-2xl border px-6 py-4 shadow-sm">
      <Link href={'/'} className="flex items-center gap-3">
        <div className="bg-primary flex size-10 items-center justify-center rounded-xl shadow-md">
          <svg
            className="size-6 text-white"
            viewBox="0 0 348 287"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M332.486 -0.000976562C336.258 -0.000978208 338.671 4.01546 336.901 7.3457L217.45 232H342.677C346.449 232 348.863 236.017 347.091 239.348L323.157 284.348C322.289 285.98 320.591 287 318.743 287H159.744C159.687 287.001 159.631 287.003 159.574 287.003H154.801C151.843 287.003 149.127 285.371 147.738 282.759L144.361 276.407C144.331 276.351 144.304 276.292 144.275 276.235L1.30536 7.34863C-0.465343 4.01842 1.94781 0.00123224 5.71943 0.000976562H57.8522C59.7072 0.00109416 61.41 1.02803 62.2751 2.66895L169.118 205.331L248.35 55H166.12C162.118 54.9997 159.737 50.5313 161.97 47.21L192.225 2.20996C193.154 0.82846 194.71 0.000100612 196.375 0H280.325C280.335 -5.73296e-05 280.344 -0.000976174 280.354 -0.000976562H332.486Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight">VaultZ</h1>
          <p className="text-muted-foreground text-xs">
            v{process.env.version}
          </p>
        </div>
      </Link>

      <nav className="flex items-center gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);

          return (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                className={cn(
                  'hover:bg-nav-hover gap-2 transition-colors',
                  isActive &&
                    'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                )}
              >
                <Icon className="size-4" />
                {label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <User className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>User Management</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <UserDialog user={undefined}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Plus className="mr-2 size-4" />
                Add User
              </DropdownMenuItem>
            </UserDialog>
            <Link href="/users">
              <DropdownMenuItem>
                <Users className="mr-2 size-4" />
                View All Users
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
        <ModeToggle />
      </div>
    </header>
  );
}
