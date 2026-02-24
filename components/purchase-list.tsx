'use client';

import { useMemo, useState } from 'react';

import { useYear } from '@/contexts/YearContext';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  Check,
  CircleDollarSign,
  FileCheck,
  StickyNote,
} from 'lucide-react';

import { User } from '@/prisma/client';

import {
  Allocation,
  AllocationGroupWithAllocations,
  CategoryWithDesignation,
  ProcessTemplateWithStepCount,
  PurchaseWithUser,
} from '@/lib/types';
import { formatCurrency, parseDateOnly } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { EmptyState } from './empty-state';
import { PurchaseDialog } from './purchase-dialog';

export function PurchaseList({
  purchases,
  users,
  categories,
  allocationGroups,
  miscAllocations,
  processTemplates = [],
}: {
  purchases: PurchaseWithUser[];
  users: User[];
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
  processTemplates?: ProcessTemplateWithStepCount[];
}) {
  const { selectedYear } = useYear();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const filteredPurchases = useMemo(
    () =>
      selectedYear
        ? purchases.filter((p) => p.yearId === selectedYear.id)
        : purchases,
    [purchases, selectedYear],
  );

  const columns = useMemo<ColumnDef<PurchaseWithUser>[]>(
    () => [
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Amount
            <ArrowUpDown className="ml-1 size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-semibold">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        id: 'user',
        accessorFn: (row) => `${row.user.first} ${row.user.last}`,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            User
            <ArrowUpDown className="ml-1 size-3.5" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Description
            <ArrowUpDown className="ml-1 size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground max-w-xs truncate text-sm">
            {row.original.description || 'No description'}
          </span>
        ),
      },
      {
        accessorKey: 'purchasedAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date
            <ArrowUpDown className="ml-1 size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            <DateTime date={row.original.purchasedAt} dateOnly />
          </span>
        ),
        sortingFn: (a, b) =>
          parseDateOnly(a.original.purchasedAt).getTime() -
          parseDateOnly(b.original.purchasedAt).getTime(),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const { excludeFromTotal, expenseReportCreated, reimbursed, notes } =
            row.original;
          return (
            <div className="flex items-center gap-1.5">
              {excludeFromTotal && (
                <div className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
                  <CircleDollarSign className="size-3" />
                  <span className="text-xs">Excluded</span>
                </div>
              )}
              {expenseReportCreated && (
                <div className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
                  <FileCheck className="size-3" />
                  <span className="text-xs">Report Filed</span>
                </div>
              )}
              {reimbursed && (
                <div className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
                  <Check className="size-3" />
                  <span className="text-xs">Reimbursed</span>
                </div>
              )}
              {notes && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex size-7 items-center justify-center rounded-lg">
                        <StickyNote className="text-muted-foreground size-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-sm">
                      <p className="text-sm whitespace-pre-wrap">{notes}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredPurchases,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (filteredPurchases.length === 0)
    return (
      <EmptyState
        message="No purchases yet"
        description="Record purchases to track spending"
      />
    );

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Filter purchases..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <PurchaseDialog
                  key={row.id}
                  trigger={
                    <TableRow className="cursor-pointer">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  }
                  purchase={row.original}
                  users={users}
                  categories={categories}
                  allocationGroups={allocationGroups}
                  miscAllocations={miscAllocations}
                  processTemplates={processTemplates}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
