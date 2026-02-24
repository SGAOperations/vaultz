'use client';

import { useState } from 'react';

import { AlertTriangle } from 'lucide-react';

import { formatCurrency } from '@/lib/utils';

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

interface TransferWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  availableAmount: number;
  transferAmount: number;
  onConfirm: () => void;
}

export function TransferWarningDialog({
  open,
  onOpenChange,
  categoryName,
  availableAmount,
  transferAmount,
  onConfirm,
}: TransferWarningDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const deficit = transferAmount - availableAmount;

  function handleOpenChange(value: boolean) {
    if (!value) setConfirmed(false);
    onOpenChange(value);
  }

  function handleConfirm() {
    setConfirmed(false);
    onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            <DialogTitle>Insufficient Funds Warning</DialogTitle>
          </div>
          <DialogDescription>
            This transfer exceeds the available amount in{' '}
            <span className="text-foreground font-medium">{categoryName}</span>.
            The category will have a negative balance of{' '}
            <span className="text-destructive font-medium">
              {formatCurrency(deficit)}
            </span>
            . Continue?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/20">
          <p>
            <span className="text-muted-foreground">Category:</span>{' '}
            <span className="font-medium">{categoryName}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Available:</span>{' '}
            <span className="font-medium">
              {formatCurrency(availableAmount)}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Transfer Amount:</span>{' '}
            <span className="font-medium">
              {formatCurrency(transferAmount)}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Deficit:</span>{' '}
            <span className="text-destructive font-medium">
              -{formatCurrency(deficit)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="confirm-overdraft"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <label htmlFor="confirm-overdraft" className="cursor-pointer text-sm">
            I understand this will create a negative balance
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-amber-500 text-white hover:bg-amber-600"
            disabled={!confirmed}
            onClick={handleConfirm}
          >
            Confirm Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
