'use client';

import { useState } from 'react';

import { Loader2 } from 'lucide-react';

import { markStepComplete } from '@/prisma/services/purchase';

import { PurchaseProcessStep } from '@/lib/types';
import { handleError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MarkCompleteModalProps {
  step: PurchaseProcessStep | null;
  purchaseProcessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (completion: {
    id: string;
    markedAt: Date;
    completionDate: Date | null;
    notes: string | null;
  }) => void;
}

function todayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function MarkCompleteModal({
  step,
  purchaseProcessId,
  open,
  onOpenChange,
  onComplete,
}: MarkCompleteModalProps) {
  const [completionDate, setCompletionDate] = useState<Date>(todayDate());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    if (!step) return;
    setIsSubmitting(true);
    const markedAt = new Date();
    const utcCompletionDate = new Date(
      Date.UTC(
        completionDate.getFullYear(),
        completionDate.getMonth(),
        completionDate.getDate(),
      ),
    );
    const result = await handleError(
      markStepComplete(purchaseProcessId, step.id, {
        completionDate: utcCompletionDate,
        notes: notes || null,
      }),
      {
        toast: {
          loading: 'Marking step complete...',
          success: 'Step marked as complete',
          error: 'Failed to mark step complete',
        },
        onSuccess: (res) => {
          onComplete({
            id: res.id,
            markedAt,
            completionDate: utcCompletionDate,
            notes: notes || null,
          });
          onOpenChange(false);
        },
      },
    );
    void result;
    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Step Complete</DialogTitle>
          <DialogDescription>
            Mark &quot;{step?.name}&quot; as complete.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Actual Completion Date</Label>
            <DatePicker value={completionDate} onChange={setCompletionDate} />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this step..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-1 size-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
