'use client';

import { useMemo, useState } from 'react';

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Download,
  StickyNote,
  X,
} from 'lucide-react';

import { Category as PrismaCategory } from '@/prisma/client';

import { TransferWithYear } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
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

function SortHeader({
  column,
  label,
}: {
  column: {
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (desc: boolean) => void;
  };
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Sort by ${label}, currently ${sorted || 'unsorted'}`}
      className={cn('-ml-3', sorted && 'text-foreground')}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="ml-1 size-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-1 size-3.5" />
      ) : (
        <ArrowUpDown className="ml-1 size-3.5 opacity-40" />
      )}
    </Button>
  );
}

function exportToCsv(transfers: TransferWithYear[]) {
  const headers = ['Date', 'From Category', 'To Category', 'Amount', 'Notes'];
  const rows = transfers.map((t) => [
    new Date(t.createdAt).toLocaleString(),
    t.fromCategory.name,
    t.toCategory.name,
    t.amount.toFixed(2),
    t.notes ?? '',
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transfer-history.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function TransferHistory({
  transfers,
  categories,
}: {
  transfers: TransferWithYear[];
  categories: PrismaCategory[];
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [categoryId, setCategoryId] = useState<string>('');

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      const date = new Date(t.createdAt);
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (date < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (date > to) return false;
      }
      if (
        categoryId &&
        t.fromCategoryId !== categoryId &&
        t.toCategoryId !== categoryId
      )
        return false;
      return true;
    });
  }, [transfers, fromDate, toDate, categoryId]);

  const hasFilters =
    fromDate !== undefined || toDate !== undefined || categoryId !== '';

  const columns = useMemo<ColumnDef<TransferWithYear>[]>(
    () => [
      {
        id: 'createdAt',
        accessorFn: (row) => row.createdAt,
        header: ({ column }) => <SortHeader column={column} label="Date" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Calendar className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground text-sm">
              <DateTime date={row.original.createdAt} />
            </span>
          </div>
        ),
        sortingFn: (a, b) =>
          new Date(a.original.createdAt).getTime() -
          new Date(b.original.createdAt).getTime(),
      },
      {
        id: 'fromCategory',
        accessorFn: (row) => row.fromCategory.name,
        header: ({ column }) => (
          <SortHeader column={column} label="From Category" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.fromCategory.name}</span>
        ),
      },
      {
        id: 'toCategory',
        accessorFn: (row) => row.toCategory.name,
        header: ({ column }) => (
          <SortHeader column={column} label="To Category" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <ArrowRight className="text-muted-foreground size-4 shrink-0" />
            <span className="font-medium">{row.original.toCategory.name}</span>
          </div>
        ),
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => <SortHeader column={column} label="Amount" />,
        cell: ({ row }) => (
          <span className="font-semibold">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ row }) => {
          const { notes } = row.original;
          if (!notes) return null;
          return (
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
          );
        },
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (transfers.length === 0)
    return (
      <EmptyState
        message="No transfers yet"
        description="Transfer funds between categories to see them here"
      />
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">
            From date
          </span>
          <div className="flex items-center gap-1">
            <DatePicker value={fromDate} onChange={setFromDate} />
            {fromDate && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear from date"
                className="size-9 shrink-0"
                onClick={() => setFromDate(undefined)}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">
            To date
          </span>
          <div className="flex items-center gap-1">
            <DatePicker value={toDate} onChange={setToDate} />
            {toDate && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear to date"
                className="size-9 shrink-0"
                onClick={() => setToDate(undefined)}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">
            Category
          </span>
          <div className="flex items-center gap-1">
            <div className="w-44">
              <Combobox
                name="category"
                value={categoryId}
                onChange={setCategoryId}
                data={[
                  {
                    items: categories.map((c) => ({
                      label: c.name,
                      value: c.id,
                    })),
                  },
                ]}
              />
            </div>
            {categoryId && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear category filter"
                className="size-9 shrink-0"
                onClick={() => setCategoryId('')}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFromDate(undefined);
              setToDate(undefined);
              setCategoryId('');
            }}
          >
            Clear filters
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {filtered.length} transfer{filtered.length !== 1 ? 's' : ''}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCsv(filtered)}
          >
            <Download className="mr-1.5 size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message="No transfers match your filters"
          description="Try adjusting the date range or category filter"
        />
      ) : (
        <div className="rounded-lg border">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-44" />
              <col className="w-40" />
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-16" />
            </colgroup>
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
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
