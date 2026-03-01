'use client';

import { useEffect, useMemo, useState } from 'react';

import { useYear } from '@/contexts/YearContext';
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Check,
  CircleDollarSign,
  DollarSign,
  FileCheck,
  FileText,
  StickyNote,
  User as UserIcon,
  X,
} from 'lucide-react';

import { User } from '@/prisma/client';
import { getPurchaseProcess } from '@/prisma/services/purchase';

import {
  Allocation,
  AllocationGroupWithAllocations,
  CategoryWithDesignation,
  ProcessTemplateWithStepCount,
  PurchaseProcessData,
  PurchaseWithUser,
} from '@/lib/types';
import { cn, formatCurrency, parseDateOnly } from '@/lib/utils';

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
import { getStepStatus } from './process-progress';
import { PurchaseDialog } from './purchase-dialog';

type StatusFilter = 'excludeFromTotal' | 'expenseReportCreated' | 'reimbursed';

const STATUS_FILTERS: {
  key: StatusFilter;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'excludeFromTotal', label: 'Excluded', Icon: CircleDollarSign },
  { key: 'expenseReportCreated', label: 'Report Filed', Icon: FileCheck },
  { key: 'reimbursed', label: 'Reimbursed', Icon: Check },
];

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

function ProcessCellContent({ data }: { data: PurchaseProcessData }) {
  const total = data.steps.length;
  if (total === 0) return null;

  const completed = data.steps.filter((s) => s.completion !== null).length;
  const nextPending = data.steps.find(
    (s) => s.completion === null && getStepStatus(s, data.steps) !== 'bypassed',
  );

  return (
    <div className="flex items-center gap-1.5 overflow-hidden">
      <div className="flex shrink-0 gap-0.5">
        {data.steps.map((step) => {
          const status = getStepStatus(step, data.steps);
          return (
            <div
              key={step.id}
              className={cn('size-1.5 rounded-full transition-colors', {
                'bg-green-500': status === 'completed',
                'bg-yellow-400': status === 'bypassed',
                'bg-muted-foreground/20': status === 'pending',
              })}
            />
          );
        })}
      </div>
      <span className="text-muted-foreground/60 truncate text-xs">
        {completed}/{total}
        {nextPending && (
          <>
            {' · '}
            <span className="text-muted-foreground/40">Next:</span>{' '}
            {nextPending.name}
          </>
        )}
      </span>
    </div>
  );
}

function PurchaseTableRow({
  row,
  users,
  categories,
  allocationGroups,
  miscAllocations,
  processTemplates,
}: {
  row: Row<PurchaseWithUser>;
  users: User[];
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
  processTemplates: ProcessTemplateWithStepCount[];
}) {
  const [processData, setProcessData] = useState<
    PurchaseProcessData | null | undefined
  >(undefined);

  useEffect(() => {
    getPurchaseProcess(row.original.id)
      .then(setProcessData)
      .catch(() => setProcessData(null));
  }, [row.original.id]);

  const isIncomplete =
    !!processData && processData.steps.some((s) => s.completion === null);

  return (
    <PurchaseDialog
      trigger={
        <TableRow
          className={cn(
            'cursor-pointer',
            isIncomplete && 'border-l-2 border-l-amber-400',
          )}
        >
          {row.getVisibleCells().map((cell) => (
            <TableCell key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
          <TableCell>
            {processData && <ProcessCellContent data={processData} />}
          </TableCell>
        </TableRow>
      }
      purchase={row.original}
      users={users}
      categories={categories}
      allocationGroups={allocationGroups}
      miscAllocations={miscAllocations}
      processTemplates={processTemplates}
      onProcessDataChange={setProcessData}
    />
  );
}

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
  'use no memo';
  const { selectedYear } = useYear();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilter>>(
    new Set(),
  );

  const yearFiltered = useMemo(
    () =>
      selectedYear
        ? purchases.filter((p) => p.yearId === selectedYear.id)
        : purchases,
    [purchases, selectedYear],
  );

  const filteredPurchases = useMemo(() => {
    if (statusFilters.size === 0) return yearFiltered;
    return yearFiltered.filter((p) => [...statusFilters].some((key) => p[key]));
  }, [yearFiltered, statusFilters]);

  const toggleStatusFilter = (key: StatusFilter) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const columns = useMemo<ColumnDef<PurchaseWithUser>[]>(
    () => [
      {
        accessorKey: 'amount',
        header: ({ column }) => <SortHeader column={column} label="Amount" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <DollarSign className="text-primary size-4" />
            </div>
            <span className="font-semibold">
              {formatCurrency(row.original.amount)}
            </span>
          </div>
        ),
      },
      {
        id: 'user',
        accessorFn: (row) => `${row.user.first} ${row.user.last}`,
        header: ({ column }) => <SortHeader column={column} label="User" />,
        cell: ({ getValue }) => (
          <div className="flex items-center gap-1.5">
            <UserIcon className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground text-sm">
              {getValue<string>()}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <SortHeader column={column} label="Description" />
        ),
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-1.5">
            <FileText className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground truncate text-sm">
              {row.original.description || 'No description'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'purchasedAt',
        header: ({ column }) => <SortHeader column={column} label="Date" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Calendar className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground text-sm">
              <DateTime date={row.original.purchasedAt} dateOnly />
            </span>
          </div>
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
          const hasStatus =
            excludeFromTotal || expenseReportCreated || reimbursed || notes;
          if (!hasStatus) return null;
          return (
            <div className="flex flex-wrap items-center gap-1.5">
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

  // eslint-disable-next-line react-hooks/incompatible-library
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

  if (yearFiltered.length === 0)
    return (
      <EmptyState
        message="No purchases yet"
        description="Record purchases to track spending"
      />
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Input
            placeholder="Filter purchases..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className={cn(globalFilter && 'pr-8')}
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear filter"
              className="absolute top-1/2 right-1 size-6 -translate-y-1/2"
              onClick={() => setGlobalFilter('')}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(({ key, label, Icon }) => (
            <Button
              key={key}
              variant={statusFilters.has(key) ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => toggleStatusFilter(key)}
            >
              <Icon className="size-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-44" />
            <col className="w-36" />
            <col className="w-auto" />
            <col className="w-32" />
            <col className="w-44" />
            <col className="w-52" />
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
                <TableHead>Process</TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-muted-foreground h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              table
                .getRowModel()
                .rows.map((row) => (
                  <PurchaseTableRow
                    key={row.id}
                    row={row}
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
