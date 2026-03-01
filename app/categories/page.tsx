'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { useDesignation } from '@/contexts/DesignationContext';
import { BarChart2, Ellipsis } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Content } from './content';

export default function CategoriesPage() {
  const { activeDesignation } = useDesignation();

  if (!activeDesignation) notFound();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Categories"
        description={`${activeDesignation.name} · DN${activeDesignation.code}`}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/categories/comparison">
                  <BarChart2 className="size-4" />
                  Year Comparison
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <Content designationId={activeDesignation.id} />
    </div>
  );
}
