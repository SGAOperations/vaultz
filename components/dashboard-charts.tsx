'use client';

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

export function DashboardCharts({
  purchasesByMonth,
  spendingByIndex,
}: DashboardChartsProps) {
  return (
    <>
      {purchasesByMonth.length > 0 && (
        <>
          <SectionHeader title="Purchases Over Time" />
          <Card className="mb-6 p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={purchasesByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-muted-foreground text-xs"
                />
                <YAxis className="text-muted-foreground text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) =>
                    `$${value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Amount Spent"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendingByIndex}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="text-muted-foreground text-xs"
                />
                <YAxis className="text-muted-foreground text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) =>
                    `$${value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  }
                />
                <Legend />
                <Bar
                  dataKey="budget"
                  name="Budget"
                  fill="hsl(var(--stat-total))"
                />
                <Bar
                  dataKey="spent"
                  name="Spent"
                  fill="hsl(var(--stat-spent))"
                />
                <Bar
                  dataKey="remaining"
                  name="Remaining"
                  fill="hsl(var(--stat-remaining))"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </>
  );
}
