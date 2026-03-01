'use client';

import { useEffect, useState } from 'react';

import {
  Calendar,
  Check,
  CircleDollarSign,
  DollarSign,
  FileCheck,
  FileText,
  StickyNote,
  User as UserIcon,
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
import { cn, formatCurrency } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { getStepStatus } from './process-progress';
import { PurchaseDialog } from './purchase-dialog';

function ProcessCardIndicator({ data }: { data: PurchaseProcessData }) {
  const total = data.steps.length;
  if (total === 0) return null;

  const completed = data.steps.filter((s) => s.completion !== null).length;
  const nextPending = data.steps.find(
    (s) => s.completion === null && getStepStatus(s, data.steps) !== 'bypassed',
  );

  return (
    <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
      <div className="flex shrink-0 gap-0.5">
        {data.steps.map((step) => {
          const status = getStepStatus(step, data.steps);
          return (
            <div
              key={step.id}
              className={`size-1.5 rounded-full transition-colors ${
                status === 'completed'
                  ? 'bg-green-500'
                  : status === 'bypassed'
                    ? 'bg-yellow-400'
                    : 'bg-muted-foreground/20'
              }`}
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

export function PurchaseCard({
  purchase,
  users,
  categories,
  allocationGroups,
  miscAllocations,
  processTemplates = [],
  stopPropagation = false,
}: {
  purchase: PurchaseWithUser;
  users: User[];
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
  processTemplates?: ProcessTemplateWithStepCount[];
  stopPropagation?: boolean;
}) {
  const [processData, setProcessData] = useState<
    PurchaseProcessData | null | undefined
  >(undefined);

  useEffect(() => {
    getPurchaseProcess(purchase.id)
      .then(setProcessData)
      .catch(() => setProcessData(null));
  }, [purchase.id]);

  const isIncomplete =
    !!processData && processData.steps.some((s) => s.completion === null);

  return (
    <PurchaseDialog
      trigger={
        <Card
          key={purchase.id}
          className={cn(
            'hover:border-primary/20 hover:bg-accent/50 cursor-pointer overflow-hidden p-3 transition-all duration-150',
            isIncomplete && 'border-l-2 border-l-amber-400',
          )}
          onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        >
          <div className="grid grid-cols-12 items-center gap-2">
            <div className="col-span-3 flex items-center gap-2">
              <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                <DollarSign className="text-primary size-4" />
              </div>
              <span className="font-semibold">
                {formatCurrency(purchase.amount)}
              </span>
            </div>

            <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
              <UserIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="text-muted-foreground truncate text-sm">
                {purchase.user.first} {purchase.user.last}
              </span>
            </div>

            <div className="col-span-3 flex items-center gap-1.5 overflow-hidden">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              <span className="text-muted-foreground truncate text-sm">
                {purchase.description || 'No description'}
              </span>
            </div>

            <div className="col-span-2 flex items-center justify-end gap-1.5">
              <Calendar className="text-muted-foreground size-4 shrink-0" />
              <span className="text-muted-foreground text-sm">
                <DateTime date={purchase.purchasedAt} dateOnly />
              </span>
            </div>

            <div className="col-span-1 flex items-center justify-end">
              {purchase.notes && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="hover:bg-accent/50 flex size-8 items-center justify-center rounded-lg transition-colors">
                        <StickyNote className="text-muted-foreground size-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-sm">
                      <p className="text-sm whitespace-pre-wrap">
                        {purchase.notes}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Selector Status Badges */}
          {(purchase.excludeFromTotal ||
            purchase.expenseReportCreated ||
            purchase.reimbursed) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {purchase.excludeFromTotal && (
                <div className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
                  <CircleDollarSign className="size-3" />
                  <span className="text-xs">Excluded</span>
                </div>
              )}
              {purchase.expenseReportCreated && (
                <div className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
                  <FileCheck className="size-3" />
                  <span className="text-xs">Report Filed</span>
                </div>
              )}
              {purchase.reimbursed && (
                <div className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
                  <Check className="size-3" />
                  <span className="text-xs">Reimbursed</span>
                </div>
              )}
            </div>
          )}

          {/* Process Progress Indicator */}
          {processData && <ProcessCardIndicator data={processData} />}
        </Card>
      }
      purchase={purchase}
      users={users}
      categories={categories}
      allocationGroups={allocationGroups}
      miscAllocations={miscAllocations}
      processTemplates={processTemplates}
      onProcessDataChange={setProcessData}
    />
  );
}
