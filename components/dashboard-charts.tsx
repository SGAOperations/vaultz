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
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={purchasesByMonth}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickLine={{ stroke: '#9ca3af' }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickLine={{ stroke: '#9ca3af' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{ color: '#111827', fontWeight: 600 }}
                  formatter={(value: number) => [formatCurrency(value), 'Amount']}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Amount Spent"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickLine={{ stroke: '#9ca3af' }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickLine={{ stroke: '#9ca3af' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{ color: '#111827', fontWeight: 600 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="rect"
                />
                <Bar dataKey="budget" name="Budget" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="remaining"
                  name="Remaining"
                  fill="#3b82f6"
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
