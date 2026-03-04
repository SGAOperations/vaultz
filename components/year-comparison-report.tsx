'use client';

import { Fragment, useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  Minus,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { getCategoryBudgetsAcrossYears } from '@/prisma/services/category-year';
import {
  YearComparisonCategoryData,
  getYearComparisonData,
} from '@/prisma/services/year-comparison';

import { cn, formatCurrency } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { SectionHeader } from '@/components/section-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface YearOption {
  id: string;
  name: string;
}

interface DesignationOption {
  id: string;
  name: string;
  code: string;
}

interface YearComparisonReportProps {
  allYears: YearOption[];
  designations: DesignationOption[];
  defaultYearIds: string[];
}

function getComputedColor(variable: string): string {
  if (typeof window === 'undefined') return '#3b82f6';
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(variable).trim();
  return value || '#3b82f6';
}

export function YearComparisonReport({
  allYears,
  designations,
  defaultYearIds,
}: YearComparisonReportProps) {
  const [selectedYearIds, setSelectedYearIds] =
    useState<string[]>(defaultYearIds);
  const [selectedDesignationId, setSelectedDesignationId] = useState<
    string | undefined
  >(undefined);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const [colors, setColors] = useState({
    primary: '#3b82f6',
    statTotal: '#10b981',
    statSpent: '#ef4444',
    statRemaining: '#3b82f6',
    border: '#e5e7eb',
    muted: '#6b7280',
    mutedLine: '#9ca3af',
    background: '#ffffff',
    foreground: '#111827',
  });

  useEffect(() => {
    const updateColors = () => {
      setColors({
        primary: getComputedColor('--primary'),
        statTotal: getComputedColor('--stat-total'),
        statSpent: getComputedColor('--stat-spent'),
        statRemaining: getComputedColor('--stat-remaining'),
        border: getComputedColor('--border'),
        muted: getComputedColor('--muted-foreground'),
        mutedLine: getComputedColor('--muted'),
        background: getComputedColor('--background'),
        foreground: getComputedColor('--foreground'),
      });
    };
    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['year-comparison', selectedYearIds, selectedDesignationId],
    queryFn: () =>
      getYearComparisonData({
        yearIds: selectedYearIds,
        designationId: selectedDesignationId,
      }),
    enabled: selectedYearIds.length > 0,
  });

  const { data: budgetData } = useQuery({
    queryKey: ['category-budgets-across-years', selectedDesignationId],
    queryFn: () =>
      getCategoryBudgetsAcrossYears({
        designationId: selectedDesignationId ?? '',
      }),
    enabled: !!selectedDesignationId,
  });

  function toggleYear(yearId: string) {
    setSelectedYearIds((prev) =>
      prev.includes(yearId)
        ? prev.filter((id) => id !== yearId)
        : [...prev, yearId],
    );
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  function exportCsv() {
    if (!data) return;
    const { categories, years } = data;

    const headers = [
      'Category',
      'Code',
      'Designation',
      ...years.flatMap((y) => [
        `${y.name} Budget`,
        `${y.name} Spent`,
        `${y.name} Available`,
        `${y.name} Utilization %`,
      ]),
    ];

    const rows = categories.map((cat) => [
      cat.name,
      cat.code,
      cat.designationName,
      ...cat.years.flatMap((y) => [
        y.budget.toFixed(2),
        y.spent.toFixed(2),
        y.available.toFixed(2),
        y.utilization.toFixed(1),
      ]),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'year-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <TooltipProvider>
      <div className="flex w-full min-w-0 flex-col gap-4">
        {/* Filters */}
        <Card className="gap-4 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1">
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Fiscal Years
              </p>
              <div className="flex flex-wrap gap-2">
                {allYears.map((year) => (
                  <Button
                    key={year.id}
                    variant={
                      selectedYearIds.includes(year.id) ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => toggleYear(year.id)}
                    className="h-8 rounded-full px-4 text-xs"
                  >
                    {year.name}
                  </Button>
                ))}
                {allYears.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No years found
                  </p>
                )}
              </div>
            </div>

            <div className="sm:w-56">
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Designation
              </p>
              <select
                className="border-input bg-background text-foreground w-full rounded-md border px-3 py-1.5 text-sm shadow-sm focus:ring-1 focus:outline-none"
                value={selectedDesignationId ?? ''}
                onChange={(e) =>
                  setSelectedDesignationId(e.target.value || undefined)
                }
              >
                <option value="">All Designations</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (DN{d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {selectedYearIds.length === 0 && (
          <EmptyState
            message="No years selected"
            description="Select at least one fiscal year to view the report"
          />
        )}

        {selectedYearIds.length > 0 && isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {selectedYearIds.length > 0 && isError && (
          <EmptyState message="Failed to load comparison data" />
        )}

        {data && data.years.length > 0 && (
          <>
            {/* Overview Charts */}
            <SectionHeader
              title="Overview"
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCsv}
                  disabled={data.categories.length === 0}
                >
                  <Download className="size-4" />
                  Export CSV
                </Button>
              }
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Total Budgeted by Year */}
              <Card className="gap-3 p-4">
                <p className="text-sm font-medium">Total Budgeted by Year</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={data.overview}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={colors.border}
                    />
                    <XAxis
                      dataKey="yearName"
                      tick={{ fill: colors.muted, fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: colors.muted, fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      width={50}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.foreground,
                      }}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        'Budget',
                      ]}
                    />
                    <Bar
                      dataKey="totalBudget"
                      name="Budget"
                      fill={colors.statTotal}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Total Spent by Year */}
              <Card className="gap-3 p-4">
                <p className="text-sm font-medium">Total Spent by Year</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={data.overview}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={colors.border}
                    />
                    <XAxis
                      dataKey="yearName"
                      tick={{ fill: colors.muted, fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: colors.muted, fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      width={50}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.foreground,
                      }}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        'Spent',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalSpent"
                      name="Spent"
                      stroke={colors.statSpent}
                      strokeWidth={2}
                      dot={{ fill: colors.statSpent, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Budget Utilization % */}
              <Card className="gap-3 p-4">
                <p className="text-sm font-medium">Budget Utilization %</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={data.overview}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={colors.border}
                    />
                    <XAxis
                      dataKey="yearName"
                      tick={{ fill: colors.muted, fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: colors.muted, fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(v) => `${v.toFixed(0)}%`}
                      domain={[0, 100]}
                      width={45}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.foreground,
                      }}
                      formatter={(value: number) => [
                        `${value.toFixed(1)}%`,
                        'Utilization',
                      ]}
                    />
                    <Bar
                      dataKey="utilization"
                      name="Utilization %"
                      fill={colors.primary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Category Breakdown Table */}
            <SectionHeader title="Category Breakdown" />

            {data.categories.length === 0 ? (
              <EmptyState
                message="No category data found"
                description="No categories have budget or spending data for the selected years"
              />
            ) : (
              <div className="overflow-x-auto">
                <Card className="p-0">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                          Category
                        </th>
                        {data.years.map((year, idx) => (
                          <th
                            key={year.id}
                            colSpan={idx < data.years.length - 1 ? 5 : 4}
                            className="text-muted-foreground border-l px-4 py-3 text-center font-medium"
                          >
                            {year.name}
                          </th>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <th className="text-muted-foreground px-4 py-2 text-left text-xs font-normal">
                          &nbsp;
                        </th>
                        {data.years.map((year, idx) => (
                          <Fragment key={year.id}>
                            <th className="text-muted-foreground border-l px-4 py-2 text-right text-xs font-normal">
                              Budget
                            </th>
                            <th className="text-muted-foreground px-4 py-2 text-right text-xs font-normal">
                              Spent
                            </th>
                            <th className="text-muted-foreground px-4 py-2 text-right text-xs font-normal">
                              Available
                            </th>
                            <th className="text-muted-foreground px-4 py-2 text-right text-xs font-normal">
                              Utilization
                            </th>
                            {idx < data.years.length - 1 && (
                              <th className="text-muted-foreground px-4 py-2 text-right text-xs font-normal">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex cursor-help items-center gap-1">
                                      Year-over-Year Change
                                      <Info className="size-3" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Percentage change in budget compared to the
                                    previous year
                                  </TooltipContent>
                                </Tooltip>
                              </th>
                            )}
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.categories.map((category) => (
                        <CategoryRow
                          key={category.id}
                          category={category}
                          years={data.years}
                          isExpanded={expandedCategories.has(category.id)}
                          onToggle={() => toggleCategory(category.id)}
                        />
                      ))}
                    </tbody>
                    <tfoot>
                      <TotalsRow
                        categories={data.categories}
                        years={data.years}
                      />
                    </tfoot>
                  </table>
                </Card>
              </div>
            )}
          </>
        )}

        {data && data.years.length === 0 && selectedYearIds.length > 0 && (
          <EmptyState
            message="No data available"
            description="The selected years have no budget or spending records"
          />
        )}

        {/* Budget Comparison Across All Years (mirrors the Categories > Year Comparison page) */}
        {selectedDesignationId && budgetData && budgetData.years.length > 0 && (
          <>
            <SectionHeader title="Budget Comparison Across All Years" />
            <div className="overflow-x-auto">
              <Card className="p-0">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                        Category
                      </th>
                      {budgetData.years.map((year) => (
                        <th
                          key={year.id}
                          className="text-muted-foreground px-4 py-3 text-right font-medium"
                        >
                          {year.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {budgetData.categories.map((category) => (
                      <tr
                        key={category.id}
                        className="hover:bg-muted/30 border-b last:border-0"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{category.name}</div>
                          <div className="text-muted-foreground font-mono text-xs">
                            SC{category.code}
                          </div>
                        </td>
                        {category.yearBudgets.map((yb, idx) => {
                          const prevBudget =
                            idx > 0
                              ? category.yearBudgets[idx - 1].amount
                              : null;
                          const change =
                            prevBudget !== null && prevBudget > 0
                              ? ((yb.amount - prevBudget) / prevBudget) * 100
                              : null;
                          return (
                            <td
                              key={yb.yearId}
                              className="px-4 py-3 text-right"
                            >
                              {yb.amount > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="font-semibold">
                                    {formatCurrency(yb.amount)}
                                  </span>
                                  {change !== null && (
                                    <ChangeIndicator pct={change} />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td className="px-4 py-3 font-semibold">Total</td>
                      {budgetData.years.map((year, idx) => {
                        const total = budgetData.categories.reduce(
                          (acc, cat) => {
                            const yearBudget = cat.yearBudgets.find(
                              (b) => b.yearId === year.id,
                            );
                            return acc + (yearBudget?.amount ?? 0);
                          },
                          0,
                        );
                        const prevTotal =
                          idx > 0
                            ? budgetData.categories.reduce((acc, cat) => {
                                const prevYearBudget = cat.yearBudgets.find(
                                  (b) =>
                                    b.yearId === budgetData.years[idx - 1].id,
                                );
                                return acc + (prevYearBudget?.amount ?? 0);
                              }, 0)
                            : null;
                        const change =
                          prevTotal !== null && prevTotal > 0
                            ? ((total - prevTotal) / prevTotal) * 100
                            : null;
                        return (
                          <td key={year.id} className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-semibold">
                                {formatCurrency(total)}
                              </span>
                              {change !== null && (
                                <ChangeIndicator pct={change} />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </Card>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

interface CategoryRowProps {
  category: YearComparisonCategoryData;
  years: { id: string; name: string }[];
  isExpanded: boolean;
  onToggle: () => void;
}

function CategoryRow({
  category,
  years,
  isExpanded,
  onToggle,
}: CategoryRowProps) {
  return (
    <>
      <tr
        className="hover:bg-muted/30 cursor-pointer border-b"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="text-muted-foreground size-4 shrink-0" />
            ) : (
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            )}
            <div>
              <div className="font-medium">{category.name}</div>
              <div className="text-muted-foreground font-mono text-xs">
                SC{category.code} · {category.designationName}
              </div>
            </div>
          </div>
        </td>
        {category.years.map((yd, idx) => {
          const hasData = yd.budget > 0 || yd.spent > 0;
          const prevYd = idx > 0 ? category.years[idx - 1] : null;
          const yoyChange =
            prevYd && prevYd.budget > 0
              ? ((yd.budget - prevYd.budget) / prevYd.budget) * 100
              : null;

          return (
            <Fragment key={yd.yearId}>
              <td className="border-l px-4 py-3 text-right">
                {hasData ? (
                  formatCurrency(yd.budget)
                ) : (
                  <span className="text-muted-foreground text-xs">N/A</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {hasData ? (
                  formatCurrency(yd.spent)
                ) : (
                  <span className="text-muted-foreground text-xs">N/A</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {hasData ? (
                  <span className={cn(yd.available < 0 && 'text-destructive')}>
                    {formatCurrency(yd.available)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">N/A</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {hasData ? (
                  <span
                    className={cn(
                      'text-xs font-medium',
                      yd.utilization > 100 && 'text-destructive',
                      yd.utilization >= 80 &&
                        yd.utilization <= 100 &&
                        'text-warning',
                    )}
                  >
                    {yd.utilization.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">N/A</span>
                )}
              </td>
              {idx < category.years.length - 1 && (
                <td className="px-4 py-3 text-right">
                  {yoyChange !== null ? (
                    <ChangeIndicator pct={yoyChange} />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              )}
            </Fragment>
          );
        })}
      </tr>

      {isExpanded && (
        <tr className="border-b">
          <td colSpan={1 + years.length * 5} className="bg-muted/20 p-0">
            <div className="px-8 py-3">
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Detailed Breakdown
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground py-2 pr-4 text-left text-xs font-medium">
                      Year
                    </th>
                    <th className="text-muted-foreground py-2 pr-4 text-right text-xs font-medium">
                      Budget
                    </th>
                    <th className="text-muted-foreground py-2 pr-4 text-right text-xs font-medium">
                      Spent
                    </th>
                    <th className="text-muted-foreground py-2 pr-4 text-right text-xs font-medium">
                      Available
                    </th>
                    <th className="text-muted-foreground py-2 text-right text-xs font-medium">
                      Utilization
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {category.years.map((yd) => (
                    <tr key={yd.yearId} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{yd.yearName}</td>
                      <td className="py-2 pr-4 text-right">
                        {yd.budget > 0 ? (
                          formatCurrency(yd.budget)
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {yd.budget > 0 || yd.spent > 0 ? (
                          formatCurrency(yd.spent)
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {yd.budget > 0 || yd.spent > 0 ? (
                          <span
                            className={cn(
                              yd.available < 0 && 'text-destructive',
                            )}
                          >
                            {formatCurrency(yd.available)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {yd.budget > 0 ? (
                          <span
                            className={cn(
                              'text-xs font-medium',
                              yd.utilization > 100 && 'text-destructive',
                              yd.utilization >= 80 &&
                                yd.utilization <= 100 &&
                                'text-warning',
                            )}
                          >
                            {yd.utilization.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            N/A
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function TotalsRow({
  categories,
  years,
}: {
  categories: YearComparisonCategoryData[];
  years: { id: string; name: string }[];
}) {
  return (
    <tr className="bg-muted/30">
      <td className="px-4 py-3 font-semibold">Total</td>
      {years.map((year, idx) => {
        const totalBudget = categories.reduce((acc, cat) => {
          const y = cat.years.find((y) => y.yearId === year.id);
          return acc + (y?.budget ?? 0);
        }, 0);
        const totalSpent = categories.reduce((acc, cat) => {
          const y = cat.years.find((y) => y.yearId === year.id);
          return acc + (y?.spent ?? 0);
        }, 0);
        const totalAvailable = totalBudget - totalSpent;
        const utilization =
          totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        const prevYear = idx > 0 ? years[idx - 1] : null;
        const prevBudget = prevYear
          ? categories.reduce((acc, cat) => {
              const y = cat.years.find((y) => y.yearId === prevYear.id);
              return acc + (y?.budget ?? 0);
            }, 0)
          : null;
        const yoyChange =
          prevBudget !== null && prevBudget > 0
            ? ((totalBudget - prevBudget) / prevBudget) * 100
            : null;

        return (
          <Fragment key={year.id}>
            <td className="border-l px-4 py-3 text-right font-semibold">
              {formatCurrency(totalBudget)}
            </td>
            <td className="px-4 py-3 text-right font-semibold">
              {formatCurrency(totalSpent)}
            </td>
            <td className="px-4 py-3 text-right font-semibold">
              <span className={cn(totalAvailable < 0 && 'text-destructive')}>
                {formatCurrency(totalAvailable)}
              </span>
            </td>
            <td className="px-4 py-3 text-right font-semibold">
              <span
                className={cn(
                  'text-xs',
                  utilization > 100 && 'text-destructive',
                  utilization >= 80 && utilization <= 100 && 'text-warning',
                )}
              >
                {utilization.toFixed(1)}%
              </span>
            </td>
            {idx < years.length - 1 && (
              <td className="px-4 py-3 text-right font-semibold">
                {yoyChange !== null ? (
                  <ChangeIndicator pct={yoyChange} />
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
            )}
          </Fragment>
        );
      })}
    </tr>
  );
}

function ChangeIndicator({ pct }: { pct: number }) {
  const rounded = Math.round(pct * 10) / 10;
  const isIncrease = rounded > 0;
  const isDecrease = rounded < 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs',
        isIncrease && 'text-transfer-income',
        isDecrease && 'text-destructive',
        !isIncrease && !isDecrease && 'text-muted-foreground',
      )}
    >
      {isIncrease && <ArrowUp className="size-3" />}
      {isDecrease && <ArrowDown className="size-3" />}
      {!isIncrease && !isDecrease && <Minus className="size-3" />}
      {Math.abs(rounded)}%
    </span>
  );
}
