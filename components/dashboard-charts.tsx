'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCurrency } from '@/lib/utils';

import { SectionHeader } from '@/components/section-header';
import { Card } from '@/components/ui/card';

interface PurchaseData {
  month: string;
  amount: number;
  count: number;
}

interface SpendingData {
  name: string;
  budget: number;
  spent: number;
  remaining: number;
}

interface DashboardChartsProps {
  purchasesByMonth: PurchaseData[];
  spendingByIndex: SpendingData[];
}

function getComputedColor(variable: string): string {
  if (typeof window === 'undefined') return '#3b82f6';
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(variable).trim();
  return value || '#3b82f6';
}

export function DashboardCharts({
  purchasesByMonth,
  spendingByIndex,
}: DashboardChartsProps) {
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

    // Listen for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {purchasesByMonth.length > 0 && (
        <>
          <SectionHeader title="Purchases Over Time" />
          <Card className="mb-6 p-6">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={purchasesByMonth}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: colors.muted, fontSize: 12 }}
                  tickLine={{ stroke: colors.mutedLine }}
                />
                <YAxis
                  tick={{ fill: colors.muted, fontSize: 12 }}
                  tickLine={{ stroke: colors.mutedLine }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: colors.foreground,
                  }}
                  labelStyle={{ color: colors.foreground, fontWeight: 600 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Amount Spent"
                  stroke={colors.primary}
                  strokeWidth={3}
                  dot={{ fill: colors.primary, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {spendingByIndex.length > 0 && (
        <>
          <SectionHeader title="Spending by Index" />
          <Card className="mb-6 p-6">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={spendingByIndex}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: colors.muted, fontSize: 12 }}
                  tickLine={{ stroke: colors.mutedLine }}
                />
                <YAxis
                  tick={{ fill: colors.muted, fontSize: 12 }}
                  tickLine={{ stroke: colors.mutedLine }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: colors.foreground,
                  }}
                  labelStyle={{ color: colors.foreground, fontWeight: 600 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="rect"
                />
                <Bar
                  dataKey="budget"
                  name="Budget"
                  fill={colors.statTotal}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="spent"
                  name="Spent"
                  fill={colors.statSpent}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="remaining"
                  name="Remaining"
                  fill={colors.statRemaining}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </>
  );
}
