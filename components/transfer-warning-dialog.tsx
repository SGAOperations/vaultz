'use client';

import { AlertTriangle } from 'lucide-react';

import { formatCurrency } from '@/lib/utils';

import { Button } from '@/components/ui/button';
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
  const deficit = transferAmount - availableAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-5" />
            Insufficient Funds Warning
          </DialogTitle>
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

        <div className="bg-muted space-y-1 rounded-lg p-3 text-sm">
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Confirm Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
