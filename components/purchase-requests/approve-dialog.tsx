'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Check, Loader2 } from 'lucide-react';

import { approvePurchaseRequest } from '@/prisma/services/purchase-request';

import { WHOLE_INDEX, chargeableIndexes } from '@/lib/purchase-request';
import {
  PersonName,
  PurchaseRequestDetail,
  RequestFormDivision,
  RequestFormOptions,
} from '@/lib/types';
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
  wholeIndexes: RequestFormOptions['wholeIndexes'];
  methods: { id: string; name: string; requiresPurchaser: boolean }[];
  users: PersonName[];
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
  const indexes = useMemo(
    () => chargeableIndexes(options.divisions, options.wholeIndexes),
    [options.divisions, options.wholeIndexes],
  );
  const initialDivision = options.divisions.find((d) =>
    d.allocations.some((a) => a.id === request.allocation?.id),
  );
  const [indexId, setIndexId] = useState(request.designation.id);
  const [divisionId, setDivisionId] = useState(
    initialDivision?.id ?? (request.allocation ? '' : WHOLE_INDEX),
  );
  const [allocationId, setAllocationId] = useState(
    request.allocation?.id ?? '',
  );
  const isWholeIndex = divisionId === WHOLE_INDEX;
  const [categoryId, setCategoryId] = useState(request.category?.id ?? '');
  const [templateId, setTemplateId] = useState(
    request.purchasingMethod?.id ?? '',
  );
  const [conditions, setConditions] = useState('');
  const [recordedUserId, setRecordedUserId] = useState(
    request.purchaser?.id ?? '',
  );
  // A reimbursement's purchase is recorded under its E-Board purchaser; any
  // other purchase under someone the approver picks.
  const isReimbursement =
    options.methods.find((m) => m.id === templateId)?.requiresPurchaser ??
    false;
  const picksRecordedUser = !(isReimbursement && request.purchaser);

  const division = useMemo(
    () => options.divisions.find((d) => d.id === divisionId),
    [options.divisions, divisionId],
  );
  const categories = isWholeIndex
    ? (options.wholeIndexes.find((w) => w.id === indexId)?.categories ?? [])
    : (division?.categories ?? []);
  const skipping =
    request.status === 'PURCHASER_REVIEW'
      ? "This skips the E-Board purchaser's and divisional head's approval."
      : request.status === 'HEAD_REVIEW'
        ? "This skips the divisional head's approval."
        : request.status === 'NEEDS_REVISION'
          ? 'This approves it without the revision.'
          : null;

  function changeDivision(id: string) {
    setDivisionId(id);
    setAllocationId('');
    setCategoryId('');
  }

  function changeIndex(id: string) {
    setIndexId(id);
    const only = options.divisions.filter((d) => d.designationId === id);
    changeDivision(only.length === 1 ? only[0].id : '');
  }

  async function approve() {
    setBusy(true);
    const result = await handleError(
      approvePurchaseRequest({
        id: request.id,
        note: conditions.trim(),
        allocationId: isWholeIndex ? '' : allocationId,
        designationId: indexId,
        categoryId: categoryId || undefined,
        processTemplateId: templateId || undefined,
        recordedUserId: picksRecordedUser ? recordedUserId : undefined,
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
              skipping,
              picksRecordedUser
                ? 'Approving creates a purchase, dated today, for the requested amount, recorded under the person you choose.'
                : 'Approving creates a purchase for the E-Board purchaser, dated today, for the requested amount, so they can go ahead right away.',
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
          <div className="grid items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            <div className="flex flex-col gap-2">
              <Label>Index</Label>
              <Combobox
                name="index"
                value={indexId}
                onChange={changeIndex}
                data={[
                  {
                    items: indexes.map((i) => ({
                      label: i.label,
                      value: i.id,
                    })),
                  },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Division</Label>
              <Combobox
                name="division"
                value={divisionId}
                onChange={changeDivision}
                disabled={!indexId}
                data={[
                  {
                    items: [
                      ...options.divisions
                        .filter((d) => d.designationId === indexId)
                        .map((d) => ({ label: d.name, value: d.id })),
                      {
                        label: 'Whole index (no division)',
                        value: WHOLE_INDEX,
                      },
                    ],
                  },
                ]}
              />
            </div>
            <div className={isWholeIndex ? 'hidden' : 'flex flex-col gap-2'}>
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
                disabled={!division && !isWholeIndex}
                data={[
                  {
                    items: categories.map((c) => ({
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

          {picksRecordedUser && (
            <div className="flex flex-col gap-2">
              <Label>Record the purchase under</Label>
              <Combobox
                name="person"
                value={recordedUserId}
                onChange={setRecordedUserId}
                data={[
                  {
                    items: options.users.map((u) => ({
                      label: `${u.first} ${u.last}`,
                      value: u.id,
                    })),
                  },
                ]}
              />
            </div>
          )}

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
            disabled={
              busy ||
              (!allocationId && !isWholeIndex) ||
              !categoryId ||
              (picksRecordedUser && !recordedUserId)
            }
          >
            {busy && <Loader2 className="animate-spin" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
