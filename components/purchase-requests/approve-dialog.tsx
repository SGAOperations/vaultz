'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Check, Loader2 } from 'lucide-react';

import { approvePurchaseRequest } from '@/prisma/services/purchase-request';

import { PurchaseRequestDetail, RequestFormDivision } from '@/lib/types';
import { handleError, isError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface ApprovalOptions {
  divisions: RequestFormDivision[];
  methods: { id: string; name: string }[];
}

interface ApproveDialogProps {
  request: PurchaseRequestDetail;
  options: ApprovalOptions;
  isVpoa: boolean;
}

// Approving is also the Comptroller's financial review: they can correct the
// coding and attach conditions for the purchaser.
export function ApproveDialog({
  request,
  options,
  isVpoa,
}: ApproveDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [divisionId, setDivisionId] = useState(
    () =>
      options.divisions.find((d) =>
        d.allocations.some((a) => a.id === request.allocation.id),
      )?.id ?? '',
  );
  const [allocationId, setAllocationId] = useState(request.allocation.id);
  const [categoryId, setCategoryId] = useState(request.category.id);
  const [templateId, setTemplateId] = useState(
    request.purchasingMethod?.id ?? '',
  );
  const [conditions, setConditions] = useState('');

  const division = useMemo(
    () => options.divisions.find((d) => d.id === divisionId),
    [options.divisions, divisionId],
  );
  const beforePurchaser =
    request.status === 'PURCHASER_REVIEW' ||
    request.status === 'NEEDS_REVISION';

  function changeDivision(id: string) {
    setDivisionId(id);
    setAllocationId('');
    setCategoryId('');
  }

  async function approve() {
    setBusy(true);
    const result = await handleError(
      approvePurchaseRequest({
        id: request.id,
        note: conditions.trim(),
        allocationId: allocationId || undefined,
        categoryId: categoryId || undefined,
        processTemplateId: templateId || undefined,
      }),
      {
        toast: {
          loading: 'Approving...',
          success: 'Request approved and purchase created',
        },
      },
    ).finally(() => setBusy(false));
    if (isError(result)) return;
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Check />
          Approve
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Approve request</DialogTitle>
          <DialogDescription>
            {[
              beforePurchaser && "This skips the E-Board purchaser's approval.",
              'Approving creates a purchase for the E-Board purchaser, dated today, for the requested amount, so they can go ahead right away.',
              isVpoa
                ? 'Your approval also counts as your sign-off.'
                : 'The VPOA signs off on it afterward.',
            ]
              .filter(Boolean)
              .join(' ')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-xs font-medium uppercase">
            Coding: correct it here instead of sending it back
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Division</Label>
              <Combobox
                name="division"
                value={divisionId}
                onChange={changeDivision}
                data={[
                  {
                    items: options.divisions.map((d) => ({
                      label: `${d.name} (${d.designationLabel})`,
                      value: d.id,
                    })),
                  },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Allocation</Label>
              <Combobox
                name="allocation"
                value={allocationId}
                onChange={setAllocationId}
                disabled={!division}
                data={[
                  {
                    items: (division?.allocations ?? []).map((a) => ({
                      label: `${a.name} · ${a.periodName}`,
                      value: a.id,
                    })),
                  },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Combobox
                name="category"
                value={categoryId}
                onChange={setCategoryId}
                disabled={!division}
                data={[
                  {
                    items: (division?.categories ?? []).map((c) => ({
                      label: `${c.code} · ${c.name}`,
                      value: c.id,
                    })),
                  },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Purchasing method</Label>
              <Combobox
                name="purchasing method"
                value={templateId}
                onChange={setTemplateId}
                data={[
                  {
                    items: options.methods.map((m) => ({
                      label: m.name,
                      value: m.id,
                    })),
                  },
                ]}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="approve-conditions">Conditions (optional)</Label>
            <Textarea
              id="approve-conditions"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Use the SGA card and keep the itemized receipt."
              maxLength={2000}
              rows={3}
              className="resize-none"
            />
            <p className="text-muted-foreground text-xs">
              The purchaser and requester get these with the approval.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={approve}
            disabled={busy || !allocationId || !categoryId}
          >
            {busy && <Loader2 className="animate-spin" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
