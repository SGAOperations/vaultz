'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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
  ChevronDown,
  CircleDollarSign,
  DollarSign,
  Download,
  FileText,
  Loader2,
  StickyNote,
  User as UserIcon,
  X,
} from 'lucide-react';

import { getBatchPurchaseProcessData } from '@/prisma/services/purchase';

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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

type StatusFilter = 'excludeFromTotal';
type StepStatusFilter = 'all' | 'completed' | 'in-progress' | 'not-started';
type TemplateFilter = 'all' | 'none' | string;

const STATUS_FILTERS: {
  key: StatusFilter;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [{ key: 'excludeFromTotal', label: 'Excluded', Icon: CircleDollarSign }];

const STEP_STATUS_OPTIONS: { value: StepStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'not-started', label: 'Not Started' },
];

const STEP_STATUS_FILTER_OPTIONS = STEP_STATUS_OPTIONS.filter(
  (o) => o.value !== 'all',
);

function getProcessStepStatus(data: PurchaseProcessData): StepStatusFilter {
  const completedCount = data.steps.filter((s) => s.completion !== null).length;
  const pendingCount = data.steps.filter(
    (s) => s.completion === null && getStepStatus(s, data.steps) !== 'bypassed',
  ).length;
  if (pendingCount === 0) return 'completed';
  if (completedCount === 0) return 'not-started';
  return 'in-progress';
}

function exportToCsv(
  purchases: PurchaseWithUser[],
  processDataMap: Record<string, PurchaseProcessData | null>,
) {
  const headers = [
    'Amount',
    'User',
    'Description',
    'Date',
    'Template',
    'Current Step',
    'Excluded',
  ];

  const rows = purchases.map((p) => {
    const proc = processDataMap[p.id];
    const currentStep = proc?.steps.find(
      (s) =>
        s.completion === null && getStepStatus(s, proc.steps) !== 'bypassed',
    );
    return [
      p.amount.toFixed(2),
      `${p.user.first} ${p.user.last}`,
      p.description,
      new Date(p.purchasedAt).toLocaleDateString(),
      proc?.templateName ?? '',
      currentStep?.name ?? '',
      p.excludeFromTotal ? 'Yes' : 'No',
    ];
  });

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => escape(String(value))).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'purchases.csv';
  a.click();
  URL.revokeObjectURL(url);
}

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
    <div className="flex flex-col gap-0.5 overflow-hidden">
      <div className="flex items-center gap-1.5">
        <span className="text-foreground/80 truncate text-xs font-medium">
          {data.templateName}
        </span>
        <span className="text-muted-foreground/50 shrink-0 text-xs">
          {completed}/{total}
        </span>
      </div>
      <div className="flex items-center gap-1.5 overflow-hidden">
        <div className="flex shrink-0 gap-0.5">
          {data.steps.map((step) => {
            const status = getStepStatus(step, data.steps);
            return (
              <div
                key={step.id}
                className={cn('size-1.5 rounded-full transition-colors', {
                  'bg-process-step-completed': status === 'completed',
                  'bg-process-step-bypassed': status === 'bypassed',
                  'bg-muted-foreground/20': status === 'pending',
                })}
              />
            );
          })}
        </div>
        {nextPending && (
          <span className="text-muted-foreground/60 truncate text-xs">
            <span className="text-muted-foreground/40">Next:</span>{' '}
            {nextPending.name}
          </span>
        )}
      </div>
    </div>
  );
}

function PurchaseTableRow({
  row,
  categories,
  allocationGroups,
  miscAllocations,
  processTemplates,
  processData,
  onProcessDataChange,
}: {
  row: Row<PurchaseWithUser>;
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
  processTemplates: ProcessTemplateWithStepCount[];
  processData: PurchaseProcessData | null | undefined;
  onProcessDataChange: (data: PurchaseProcessData | null) => void;
}) {
  const isIncomplete =
    !!processData && processData.steps.some((s) => s.completion === null);

  return (
    <PurchaseDialog
      trigger={
        <TableRow
          className={cn(
            'cursor-pointer',
            isIncomplete && 'border-l-incomplete-indicator border-l-2',
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
      categories={categories}
      allocationGroups={allocationGroups}
      miscAllocations={miscAllocations}
      processTemplates={processTemplates}
      onProcessDataChange={onProcessDataChange}
    />
  );
}

function PurchaseTotals({
  rows,
  categoryMap,
}: {
  rows: Row<PurchaseWithUser>[];
  categoryMap: Map<string, CategoryWithDesignation>;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const totalCount = rows.length;
  const totalAmount = rows.reduce((sum, r) => sum + r.original.amount, 0);

  const byCategory = new Map<
    string,
    { name: string; count: number; amount: number }
  >();
  for (const row of rows) {
    const { categoryId, amount } = row.original;
    const existing = byCategory.get(categoryId);
    if (existing) {
      existing.count += 1;
      existing.amount += amount;
    } else {
      byCategory.set(categoryId, {
        name: categoryMap.get(categoryId)?.name ?? 'Unknown Category',
        count: 1,
        amount,
      });
    }
  }

  const categoryBreakdown = [...byCategory.entries()]
    .map(([categoryId, stats]) => ({ categoryId, ...stats }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="bg-muted/20 border-border/60 flex flex-col gap-2 rounded-md border p-2 text-sm">
      <div className="text-muted-foreground flex flex-wrap items-center gap-2">
        <span className="bg-background/80 border-border/60 rounded-sm border px-2 py-0.5 font-medium">
          {totalCount} {totalCount === 1 ? 'purchase' : 'purchases'}
        </span>
        <span className="text-foreground bg-background border-border/60 rounded-sm border px-2 py-0.5 font-semibold">
          {formatCurrency(totalAmount)}
        </span>
        {categoryBreakdown.length > 1 && (
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="text-muted-foreground hover:text-foreground bg-background/80 border-border/60 flex items-center gap-1 rounded-sm border px-2 py-0.5 transition-colors"
          >
            {categoryBreakdown.length} categories
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform',
                showBreakdown && 'rotate-180',
              )}
            />
          </button>
        )}
      </div>
      {showBreakdown && categoryBreakdown.length > 1 && (
        <div className="border-border/60 text-muted-foreground flex flex-wrap items-center gap-2 border-t pt-2">
          {categoryBreakdown.map(({ categoryId, name, count, amount }) => (
            <span
              key={categoryId}
              className="bg-background/80 border-border/60 flex items-center gap-1.5 rounded-sm border px-2 py-0.5"
            >
              <span>{name}</span>
              <span className="text-muted-foreground/70">{count}</span>
              <span className="text-foreground/80 font-medium">
                {formatCurrency(amount)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function PurchaseList({
  purchases,
  categories,
  allocationGroups,
  miscAllocations,
  processTemplates = [],
  sorting: controlledSorting,
  onSortingChange: onControlledSortingChange,
}: {
  purchases: PurchaseWithUser[];
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
  processTemplates?: ProcessTemplateWithStepCount[];
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
}) {
  'use no memo';
  const { selectedYear } = useYear();
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const effectiveSorting = controlledSorting ?? internalSorting;
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilter>>(
    new Set(),
  );
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('all');
  const [stepStatusFilter, setStepStatusFilter] =
    useState<StepStatusFilter>('all');
  const [processDataMap, setProcessDataMap] = useState<
    Record<string, PurchaseProcessData | null>
  >({});
  const [processDataLoading, setProcessDataLoading] = useState(false);

  const handleProcessDataChange = useCallback(
    (purchaseId: string, data: PurchaseProcessData | null) => {
      setProcessDataMap((prev) => ({ ...prev, [purchaseId]: data }));
    },
    [],
  );

  useEffect(() => {
    if (purchases.length === 0) return;
    setProcessDataLoading(true);
    getBatchPurchaseProcessData(purchases.map((p) => p.id))
      .then((data) => {
        setProcessDataMap(data);
        setProcessDataLoading(false);
      })
      .catch(() => {
        console.error('Failed to load process data for filtering');
        setProcessDataLoading(false);
      });
  }, [purchases]);

  const yearFiltered = useMemo(
    () =>
      selectedYear
        ? purchases.filter((p) => p.yearId === selectedYear.id)
        : purchases,
    [purchases, selectedYear],
  );

  const processFiltered = useMemo(() => {
    if (templateFilter === 'all' && stepStatusFilter === 'all')
      return yearFiltered;
    return yearFiltered.filter((p) => {
      const proc = processDataMap[p.id];

      if (templateFilter === 'none') {
        if (proc) return false;
      } else if (templateFilter !== 'all') {
        if (proc?.templateId !== templateFilter) return false;
      }

      if (stepStatusFilter !== 'all') {
        if (!proc) return false;
        const status = getProcessStepStatus(proc);
        if (status !== stepStatusFilter) return false;
      }

      return true;
    });
  }, [yearFiltered, processDataMap, templateFilter, stepStatusFilter]);

  const filteredPurchases = useMemo(() => {
    if (statusFilters.size === 0) return processFiltered;
    return processFiltered.filter((p) =>
      [...statusFilters].some((key) => p[key]),
    );
  }, [processFiltered, statusFilters]);

  const toggleStatusFilter = (key: StatusFilter) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const templateFilterLabel = useMemo(() => {
    if (templateFilter === 'all') return 'All Templates';
    if (templateFilter === 'none') return 'No Process';
    return (
      processTemplates.find((t) => t.id === templateFilter)?.name ??
      'All Templates'
    );
  }, [templateFilter, processTemplates]);

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
          const { excludeFromTotal, notes } = row.original;
          const hasStatus = excludeFromTotal || notes;
          if (!hasStatus) return null;
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {excludeFromTotal && (
                <div className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
                  <CircleDollarSign className="size-3" />
                  <span className="text-xs">Excluded</span>
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

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredPurchases,
    columns,
    state: { sorting: effectiveSorting, columnFilters, globalFilter },
    onSortingChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(effectiveSorting) : updater;
      if (onControlledSortingChange) onControlledSortingChange(next);
      else setInternalSorting(next);
    },
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

        {processTemplates.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={templateFilter !== 'all' ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5 rounded-full"
                disabled={processDataLoading}
              >
                {processDataLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                {templateFilterLabel}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckboxItem
                checked={templateFilter === 'all'}
                onClick={() => setTemplateFilter('all')}
              >
                All Templates
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={templateFilter === 'none'}
                onClick={() => setTemplateFilter('none')}
              >
                No Process
              </DropdownMenuCheckboxItem>
              {processTemplates.length > 0 && <DropdownMenuSeparator />}
              {processTemplates.map((t) => (
                <DropdownMenuCheckboxItem
                  key={t.id}
                  checked={templateFilter === t.id}
                  onClick={() => setTemplateFilter(t.id)}
                >
                  {t.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex flex-wrap gap-1.5">
          {STEP_STATUS_FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={stepStatusFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5 rounded-full"
              disabled={processDataLoading}
              onClick={() =>
                setStepStatusFilter(
                  stepStatusFilter === opt.value ? 'all' : opt.value,
                )
              }
            >
              {opt.label}
            </Button>
          ))}
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

        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() =>
            exportToCsv(
              table.getRowModel().rows.map((r) => r.original),
              processDataMap,
            )
          }
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </div>
      <PurchaseTotals
        rows={table.getRowModel().rows}
        categoryMap={categoryMap}
      />
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
                    categories={categories}
                    allocationGroups={allocationGroups}
                    miscAllocations={miscAllocations}
                    processTemplates={processTemplates}
                    processData={processDataMap[row.original.id]}
                    onProcessDataChange={(data) =>
                      handleProcessDataChange(row.original.id, data)
                    }
                  />
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
