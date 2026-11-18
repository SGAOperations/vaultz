import {
  Ban,
  Check,
  CircleDashed,
  CornerUpLeft,
  type LucideIcon,
  MinusCircle,
} from 'lucide-react';

import {
  TimelineState,
  TimelineStep,
  buildApprovalTimeline,
} from '@/lib/approval-timeline';
import { PurchaseRequestDetail } from '@/lib/types';
import { cn } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MARKERS: Record<
  TimelineState,
  { icon: LucideIcon | null; className: string }
> = {
  done: {
    icon: Check,
    className: 'bg-success text-success-foreground border-success',
  },
  current: { icon: null, className: 'border-primary bg-primary/10' },
  upcoming: { icon: null, className: 'border-border bg-background' },
  skipped: {
    icon: MinusCircle,
    className: 'border-border bg-muted text-muted-foreground',
  },
  sentBack: {
    icon: CornerUpLeft,
    className: 'border-warning bg-warning/10 text-warning',
  },
  ended: {
    icon: Ban,
    className: 'border-destructive bg-destructive/10 text-destructive',
  },
};

function Marker({ state }: { state: TimelineState }) {
  const { icon: Icon, className } = MARKERS[state];
  return (
    <span
      className={cn(
        'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2',
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {state === 'current' && (
        <span className="bg-primary size-2 animate-pulse rounded-full" />
      )}
      {state === 'upcoming' && (
        <CircleDashed className="text-muted-foreground/60 size-3.5" />
      )}
    </span>
  );
}

function Step({
  step,
  last,
  passed,
}: {
  step: TimelineStep;
  last: boolean;
  // The chain has moved past this step, so its connector is filled.
  passed: boolean;
}) {
  const muted = step.state === 'upcoming' || step.state === 'skipped';
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className={cn(
            'absolute top-6 bottom-0 left-[11px] w-0.5',
            passed ? 'bg-success/60' : 'bg-border',
          )}
        />
      )}
      <Marker state={step.state} />
      <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
        <span
          className={cn(
            'text-sm font-medium',
            muted && 'text-muted-foreground',
            step.state === 'current' && 'text-primary',
            step.state === 'ended' && 'text-destructive',
            step.state === 'sentBack' && 'text-warning',
          )}
        >
          {step.label}
        </span>
        {step.detail && (
          <span className={cn('text-sm', muted && 'text-muted-foreground')}>
            {step.detail}
          </span>
        )}
        {step.at && (
          <span className="text-muted-foreground text-xs">
            <DateTime date={step.at} />
          </span>
        )}
        {step.note && (
          <span
            className={cn(
              'text-xs whitespace-pre-wrap',
              step.state === 'skipped'
                ? 'text-muted-foreground italic'
                : 'text-foreground/80',
            )}
          >
            {step.state === 'skipped' ? `Skipped: ${step.note}` : step.note}
          </span>
        )}
      </div>
    </li>
  );
}

// The request's approval chain, top to bottom, built from its status and
// history so it always agrees with the History card.
export function ApprovalTimeline({
  request,
}: {
  request: PurchaseRequestDetail;
}) {
  const steps = buildApprovalTimeline(request);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval flow</CardTitle>
      </CardHeader>
      <CardContent>
        <ol aria-label="Approval flow">
          {steps.map((step, i) => (
            <Step
              key={step.key}
              step={step}
              last={i === steps.length - 1}
              // Filled up to wherever the request has reached, through any
              // skipped steps on the way.
              passed={steps
                .slice(i + 1)
                .some((s) => s.state !== 'upcoming' && s.state !== 'skipped')}
            />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
