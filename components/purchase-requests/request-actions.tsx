'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';

import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  CornerUpLeft,
  Loader2,
  RotateCcw,
  Send,
  Undo2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  escalatePurchaseRequest,
  purchaserApprovePurchaseRequest,
  rejectPurchaseRequest,
  resendEscalationNotice,
  returnPurchaseRequest,
  sendBackPurchaseRequest,
} from '@/prisma/services/purchase-request';

import { RequestAction } from '@/lib/permissions';
import { PurchaseRequestDetail, RequestFormOptions } from '@/lib/types';
import { ErrorType, cn, handleError, isError } from '@/lib/utils';

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

import { RequestDialog } from './request-dialog';

interface RequestActionsProps {
  request: PurchaseRequestDetail;
  formOptions: RequestFormOptions | null;
  processTemplates: { id: string; name: string }[];
}

interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel: string;
  noteLabel?: string;
  noteRequired?: boolean;
  destructive?: boolean;
  withTemplate?: boolean;
  run: (input: {
    note: string;
    processTemplateId: string;
  }) => Promise<ErrorType | object>;
  success: string;
}

function ConfirmDialog({
  config,
  processTemplates,
  children,
}: {
  config: ConfirmConfig;
  processTemplates: { id: string; name: string }[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [processTemplateId, setProcessTemplateId] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const result = await handleError(
      config.run({ note: note.trim(), processTemplateId }),
      { toast: { loading: 'Working...', success: config.success } },
    ).finally(() => setBusy(false));
    if (isError(result)) return;

    if ('notified' in result && result.notified === false)
      toast.warning(
        'Escalated, but the Slack message to the VPOA failed. You can resend it from this page.',
      );
    setOpen(false);
    setNote('');
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        {config.withTemplate && processTemplates.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>Process template (optional)</Label>
            <Combobox
              name="process template"
              value={processTemplateId}
              onChange={setProcessTemplateId}
              data={[
                {
                  items: processTemplates.map((t) => ({
                    label: t.name,
                    value: t.id,
                  })),
                },
              ]}
            />
          </div>
        )}
        {config.noteLabel && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="request-action-note">{config.noteLabel}</Label>
            <Textarea
              id="request-action-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={3}
              className="resize-none"
            />
          </div>
        )}
        <DialogFooter>
          <Button
            variant={config.destructive ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={busy || (config.noteRequired && !note.trim())}
          >
            {busy && <Loader2 className="animate-spin" />}
            {config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RequestActions({
  request,
  formOptions,
  processTemplates,
}: RequestActionsProps) {
  const { id } = request;
  const can = (action: RequestAction) =>
    request.allowedActions.includes(action);

  const beforePurchaser =
    request.status === 'PURCHASER_REVIEW' ||
    request.status === 'NEEDS_REVISION';

  const configs: Partial<
    Record<
      RequestAction,
      { icon: ReactNode; label: string; config: ConfirmConfig }
    >
  > = {
    approve: {
      icon: <Check />,
      label: 'Approve',
      config: {
        title: 'Approve request',
        description: `${beforePurchaser ? "This skips the E-Board purchaser's approval. " : ''}Approving creates a purchase for the E-Board purchaser, dated today, for the requested amount. Edit the purchase later if the actual amount or date differs.`,
        confirmLabel: 'Approve',
        noteLabel: 'Note (optional)',
        withTemplate: true,
        run: ({ note, processTemplateId }) =>
          approvePurchaseRequest({
            id,
            note,
            processTemplateId: processTemplateId || undefined,
          }),
        success: 'Request approved and purchase created',
      },
    },
    purchaserApprove: {
      icon: <BadgeCheck />,
      label: 'Approve as purchaser',
      config: {
        title: 'Approve as E-Board purchaser',
        description:
          'Confirms you will make this purchase. The request then goes to the Comptroller, and the requester can no longer edit it.',
        confirmLabel: 'Approve',
        noteLabel: 'Note (optional)',
        run: ({ note }) => purchaserApprovePurchaseRequest({ id, note }),
        success: 'Approved as purchaser',
      },
    },
    sendBack: {
      icon: <CornerUpLeft />,
      label: 'Send back for revision',
      config: {
        title: 'Send back for revision',
        description:
          'The requester can edit the request and resubmit it. It goes back through the E-Board purchaser, then the Comptroller.',
        confirmLabel: 'Send back',
        noteLabel: 'What should they change?',
        noteRequired: true,
        run: ({ note }) => sendBackPurchaseRequest({ id, note }),
        success: 'Request sent back for revision',
      },
    },
    reject: {
      icon: <X />,
      label: 'Reject outright',
      config: {
        title: 'Reject outright',
        description:
          'Ends the request for good; the requester would have to submit a new one. To ask for changes instead, send it back for revision.',
        confirmLabel: 'Reject',
        noteLabel: 'Reason',
        destructive: true,
        run: ({ note }) => rejectPurchaseRequest({ id, note }),
        success: 'Request rejected',
      },
    },
    escalate: {
      icon: <ArrowUpRight />,
      label: 'Escalate to VPOA',
      config: {
        title: 'Escalate to the VPOA',
        description:
          'The VPOA gets a Slack message asking them to decide. Your approve and reject actions are hidden until you return the request.',
        confirmLabel: 'Escalate',
        noteLabel: 'Message for the VPOA (optional)',
        run: ({ note }) => escalatePurchaseRequest({ id, note }),
        success: 'Request escalated',
      },
    },
    return: {
      icon: <Undo2 />,
      label: 'Return to my queue',
      config: {
        title: 'Return request',
        description:
          'Takes the request back from the VPOA so you can decide it yourself.',
        confirmLabel: 'Return',
        noteLabel: 'Note (optional)',
        run: ({ note }) => returnPurchaseRequest({ id, note }),
        success: 'Request returned to the Comptroller',
      },
    },
    resend: {
      icon: <Send />,
      label: 'Resend Slack message',
      config: {
        title: 'Resend Slack message',
        description: 'Sends the escalation message to the VPOA again.',
        confirmLabel: 'Resend',
        run: () => resendEscalationNotice(id),
        success: 'Slack message sent',
      },
    },
    cancel: {
      icon: <RotateCcw />,
      label: 'Cancel request',
      config: {
        title: 'Cancel request',
        description:
          'Withdraws the request. It stays in your history but can no longer be approved.',
        confirmLabel: 'Cancel request',
        destructive: true,
        run: () => cancelPurchaseRequest(id),
        success: 'Request cancelled',
      },
    },
  };

  const order: RequestAction[] = [
    'purchaserApprove',
    'approve',
    'sendBack',
    'escalate',
    'return',
    'resend',
    'cancel',
    'reject',
  ];
  const visible = order.filter((a) => can(a));
  if (visible.length === 0 && !can('edit')) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {can('edit') && formOptions && (
        <RequestDialog options={formOptions} request={request} />
      )}
      {visible.map((action) => {
        const entry = configs[action];
        if (!entry) return null;
        return (
          <ConfirmDialog
            key={action}
            config={entry.config}
            processTemplates={processTemplates}
          >
            <Button
              variant={
                action === 'approve' || action === 'purchaserApprove'
                  ? 'default'
                  : action === 'reject'
                    ? 'ghost'
                    : entry.config.destructive
                      ? 'destructive'
                      : 'outline'
              }
              className={cn(
                action === 'reject' &&
                  'text-destructive hover:text-destructive',
              )}
            >
              {entry.icon}
              {entry.label}
            </Button>
          </ConfirmDialog>
        );
      })}
    </div>
  );
}
