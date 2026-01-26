'use client';

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

import {
  Allocation,
  AllocationGroupWithAllocations,
  CategoryWithDesignation,
  PurchaseWithUser,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { PurchaseDialog } from './purchase-dialog';

export function PurchaseCard({
  purchase,
  users,
  categories,
  allocationGroups,
  miscAllocations,
  stopPropagation = false,
}: {
  purchase: PurchaseWithUser;
  users: User[];
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
  stopPropagation?: boolean;
}) {
  return (
    <PurchaseDialog
      trigger={
        <Card
          key={purchase.id}
          className="hover:border-primary/20 hover:bg-accent/50 cursor-pointer overflow-hidden p-3 transition-all duration-150"
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

          {/* Step Progress */}
          {purchase.steps && purchase.steps.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{
                      width: `${Math.round((purchase.steps.filter((s) => s.completedAt).length / purchase.steps.length) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-muted-foreground text-xs">
                  {purchase.steps.filter((s) => s.completedAt).length}/
                  {purchase.steps.length}
                </span>
              </div>
            </div>
          )}
        </Card>
      }
      purchase={purchase}
      users={users}
      categories={categories}
      allocationGroups={allocationGroups}
      miscAllocations={miscAllocations}
    />
  );
}
