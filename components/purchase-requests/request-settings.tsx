'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Loader2, Plus, Trash2 } from 'lucide-react';

import type { IndexRequestAccess } from '@/prisma/client';
import {
  DivisionHead,
  setDivisionHead,
} from '@/prisma/services/allocation-groups';
import {
  IndexRequestSettings,
  addIndexRequesterPosition,
  removeIndexRequesterPosition,
  setBudgetIndex,
  setIndexHead,
  setIndexRequestAccess,
} from '@/prisma/services/designation';
import {
  setPurchasingMethod,
  setRequiresPurchaser,
} from '@/prisma/services/process-templates';
import {
  addRequesterPosition,
  removeRequesterPosition,
} from '@/prisma/services/requester-position';
import { setEBoardPurchaser } from '@/prisma/services/user';

import { INDEX_ACCESS_LABELS } from '@/lib/purchase-request';
import { PersonName } from '@/lib/types';
import { cn, handleError, isError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RequesterPositionsEditor({
  positions,
}: {
  positions: { id: string; positionKey: string }[];
}) {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await handleError(addRequesterPosition(key), {
      toast: { loading: 'Adding position...', success: 'Position added' },
    }).finally(() => setBusy(false));
    if (isError(result)) return;
    setKey('');
    router.refresh();
  }

  async function remove(id: string) {
    const result = await handleError(removeRequesterPosition(id), {
      toast: { loading: 'Removing position...', success: 'Position removed' },
    });
    if (!isError(result)) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={add} className="flex gap-2">
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="vice-president-of-campus-affairs"
          aria-label="SGAuth position key"
        />
        <Button type="submit" disabled={busy || !key.trim()} className="gap-2">
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          Add
        </Button>
      </form>
      <ul className="divide-y rounded-lg border">
        {positions.length === 0 && (
          <li className="text-muted-foreground p-3 text-sm">
            No positions can submit requests yet.
          </li>
        )}
        {positions.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-2 pl-3">
            <code className="text-sm">{p.positionKey}</code>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${p.positionKey}`}
              onClick={() => remove(p.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EBoardPurchaserList({
  users,
}: {
  users: (PersonName & { isEBoardPurchaser: boolean; signedIn: boolean })[];
}) {
  const router = useRouter();

  async function toggle(id: string, isEBoardPurchaser: boolean) {
    const result = await handleError(
      setEBoardPurchaser({ id, isEBoardPurchaser }),
      {
        toast: {
          loading: 'Saving...',
          success: isEBoardPurchaser
            ? 'Marked as E-Board purchaser'
            : 'Removed from E-Board purchasers',
        },
      },
    );
    if (!isError(result)) router.refresh();
  }

  return (
    <ul className="grid max-h-96 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
      {users.map((user) => (
        <li key={user.id}>
          <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm">
            <Checkbox
              checked={user.isEBoardPurchaser}
              onCheckedChange={(checked) => toggle(user.id, checked === true)}
            />
            <span className="flex flex-col">
              <span>
                {user.first} {user.last}
              </span>
              {user.isEBoardPurchaser && !user.signedIn && (
                <span className="text-warning text-xs">
                  Hasn&apos;t signed in yet, so can&apos;t approve or get Slack
                  messages
                </span>
              )}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function PurchasingMethodList({
  templates,
}: {
  templates: {
    id: string;
    name: string;
    isPurchasingMethod: boolean;
    requiresPurchaser: boolean;
  }[];
}) {
  const router = useRouter();

  async function toggle(id: string, isPurchasingMethod: boolean) {
    const result = await handleError(
      setPurchasingMethod({ id, isPurchasingMethod }),
      {
        toast: {
          loading: 'Saving...',
          success: isPurchasingMethod
            ? 'Offered as a purchasing method'
            : 'No longer offered as a purchasing method',
        },
      },
    );
    if (!isError(result)) router.refresh();
  }

  async function toggleReimbursement(id: string, requiresPurchaser: boolean) {
    const result = await handleError(
      setRequiresPurchaser({ id, requiresPurchaser }),
      {
        toast: {
          loading: 'Saving...',
          success: requiresPurchaser
            ? 'Requires an E-Board purchaser'
            : 'No longer requires an E-Board purchaser',
        },
      },
    );
    if (!isError(result)) router.refresh();
  }

  if (templates.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        No process templates yet. Create them under Settings → Processes.
      </p>
    );

  return (
    <ul className="divide-y rounded-lg border">
      {templates.map((template) => (
        <li
          key={template.id}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2"
        >
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={template.isPurchasingMethod}
              onCheckedChange={(checked) =>
                toggle(template.id, checked === true)
              }
            />
            {template.name}
          </label>
          {template.isPurchasingMethod && (
            <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox
                checked={template.requiresPurchaser}
                onCheckedChange={(checked) =>
                  toggleReimbursement(template.id, checked === true)
                }
              />
              Requires E-Board purchaser
            </label>
          )}
        </li>
      ))}
    </ul>
  );
}

function DivisionHeadRow({ division }: { division: DivisionHead }) {
  const router = useRouter();
  const saved = division.headPositionKey ?? '';
  const [key, setKey] = useState(saved);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await handleError(
      setDivisionHead({ id: division.id, positionKey: key }),
      {
        toast: {
          loading: 'Saving...',
          success: key.trim() ? 'Division head set' : 'Division head removed',
        },
      },
    ).finally(() => setBusy(false));
    if (!isError(result)) router.refresh();
  }

  return (
    <li className="flex flex-col gap-1.5 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-sm font-medium">{division.name}</span>
        <span className="text-muted-foreground text-xs">
          {division.designationLabel}
        </span>
      </div>
      <form onSubmit={save} className="flex gap-2">
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="No head: requests skip this step"
          aria-label={`Head position for ${division.name}`}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={busy || key.trim() === saved}
        >
          {busy && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </form>
    </li>
  );
}

export function DivisionHeadsEditor({
  divisions,
}: {
  divisions: DivisionHead[];
}) {
  if (divisions.length === 0)
    return <p className="text-muted-foreground text-sm">No divisions yet.</p>;

  return (
    <ul className="max-h-[32rem] divide-y overflow-y-auto rounded-lg border">
      {divisions.map((division) => (
        <DivisionHeadRow key={division.id} division={division} />
      ))}
    </ul>
  );
}

const ACCESS_MODES: IndexRequestAccess[] = [
  'ALLOCATIONS_ONLY',
  'BUDGET_REQUESTERS',
  'LISTED_POSITIONS',
];

function IndexAccessRow({ index }: { index: IndexRequestSettings }) {
  const router = useRouter();
  const savedHead = index.headPositionKey ?? '';
  const [head, setHead] = useState(savedHead);
  const [position, setPosition] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(
    action: Promise<object>,
    success: string,
    after?: () => void,
  ) {
    setBusy(true);
    const result = await handleError(action, {
      toast: { loading: 'Saving...', success },
    }).finally(() => setBusy(false));
    if (isError(result)) return;
    after?.();
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{index.label}</span>
        <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
          <Checkbox
            checked={index.isBudgetIndex}
            disabled={busy || index.isBudgetIndex}
            onCheckedChange={() =>
              run(setBudgetIndex(index.id), 'Budget index set')
            }
          />
          Budget index
        </label>
      </div>

      <div
        role="radiogroup"
        aria-label={`Request access for ${index.label}`}
        className="bg-muted flex w-fit flex-wrap gap-1 rounded-lg p-1"
      >
        {ACCESS_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={index.requestAccess === mode}
            disabled={busy}
            onClick={() =>
              index.requestAccess !== mode &&
              run(
                setIndexRequestAccess({ id: index.id, requestAccess: mode }),
                'Request access saved',
              )
            }
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              index.requestAccess === mode
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {INDEX_ACCESS_LABELS[mode]}
          </button>
        ))}
      </div>

      {index.requestAccess === 'LISTED_POSITIONS' && (
        <div className="flex flex-col gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                addIndexRequesterPosition({
                  designationId: index.id,
                  positionKey: position,
                }),
                'Position added',
                () => setPosition(''),
              );
            }}
            className="flex gap-2"
          >
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="director-of-sustainability"
              aria-label={`Position that can request against ${index.label}`}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={busy || !position.trim()}
            >
              <Plus />
              Add
            </Button>
          </form>
          {index.positions.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No positions listed yet, so only editors can request against the
              whole index.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {index.positions.map((p) => (
                <li
                  key={p.id}
                  className="bg-muted flex items-center gap-1 rounded px-2 py-0.5"
                >
                  <code className="text-xs">{p.positionKey}</code>
                  <button
                    type="button"
                    aria-label={`Remove ${p.positionKey}`}
                    disabled={busy}
                    onClick={() =>
                      run(
                        removeIndexRequesterPosition(p.id),
                        'Position removed',
                      )
                    }
                    className="hover:bg-accent rounded p-0.5"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {index.requestAccess !== 'ALLOCATIONS_ONLY' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              setIndexHead({ id: index.id, positionKey: head }),
              head.trim() ? 'Index head set' : 'Index head removed',
            );
          }}
          className="flex flex-col gap-1"
        >
          <Label className="text-xs" htmlFor={`index-head-${index.id}`}>
            Head for whole-index requests
          </Label>
          <div className="flex gap-2">
            <Input
              id={`index-head-${index.id}`}
              value={head}
              onChange={(e) => setHead(e.target.value)}
              placeholder="No head: requests skip this step"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={busy || head.trim() === savedHead}
            >
              {busy && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}

export function IndexAccessEditor({
  indexes,
}: {
  indexes: IndexRequestSettings[];
}) {
  if (indexes.length === 0)
    return <p className="text-muted-foreground text-sm">No indexes yet.</p>;

  return (
    <ul className="divide-y rounded-lg border">
      {indexes.map((index) => (
        <IndexAccessRow key={index.id} index={index} />
      ))}
    </ul>
  );
}
