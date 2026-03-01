'use client';

import { useState } from 'react';

import { Loader2 } from 'lucide-react';

import { copyAllocationsFromPeriod } from '@/prisma/services/allocation';

import { handleError, isError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface CopyAllocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newPeriodId: string;
  previousPeriodId: string;
  previousPeriodName: string;
}

export function CopyAllocationsDialog({
  open,
  onOpenChange,
  newPeriodId,
  previousPeriodId,
  previousPeriodName,
}: CopyAllocationsDialogProps) {
  const [copyAmounts, setCopyAmounts] = useState(true);
  const [includeCarryover, setIncludeCarryover] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCopy() {
    setIsSubmitting(true);
    const result = await handleError(
      copyAllocationsFromPeriod({
        fromPeriodId: previousPeriodId,
        toPeriodId: newPeriodId,
        copyAmounts,
        includeCarryover,
      }),
      {
        toast: {
          loading: 'Copying allocations...',
          success: 'Allocations copied successfully',
          error: 'Failed to copy allocations',
        },
      },
    );
    setIsSubmitting(false);
    if (!isError(result)) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Allocations from Previous Period</DialogTitle>
          <DialogDescription>
            Copy allocation names and amounts from{' '}
            <strong>{previousPeriodName}</strong> into the new period. You can
            also carry over unused funds.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-3">
            <Checkbox
              id="copyAmounts"
              checked={copyAmounts}
              onChange={(e) => {
                setCopyAmounts(e.target.checked);
                if (!e.target.checked) setIncludeCarryover(false);
              }}
            />
            <Label htmlFor="copyAmounts" className="cursor-pointer">
              Copy allocation amounts from previous period
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="includeCarryover"
              checked={includeCarryover}
              disabled={!copyAmounts}
              onChange={(e) => setIncludeCarryover(e.target.checked)}
            />
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor="includeCarryover"
                className={
                  !copyAmounts
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer'
                }
              >
                Include unused funds (carryover)
              </Label>
              <p className="text-muted-foreground text-xs">
                New amount = previous amount + unused funds
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button onClick={handleCopy} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Copy Allocations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
