'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Loader2, Plus, Trash2 } from 'lucide-react';

import { setPurchasingMethod } from '@/prisma/services/process-templates';
import {
  addRequesterPosition,
  removeRequesterPosition,
} from '@/prisma/services/requester-position';
import { setEBoardPurchaser } from '@/prisma/services/user';

import { PersonName } from '@/lib/types';
import { handleError, isError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

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
  templates: { id: string; name: string; isPurchasingMethod: boolean }[];
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

  if (templates.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        No process templates yet. Create them under Settings → Processes.
      </p>
    );

  return (
    <ul className="grid gap-1 rounded-lg border p-2 sm:grid-cols-2">
      {templates.map((template) => (
        <li key={template.id}>
          <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm">
            <Checkbox
              checked={template.isPurchasingMethod}
              onCheckedChange={(checked) =>
                toggle(template.id, checked === true)
              }
            />
            {template.name}
          </label>
        </li>
      ))}
    </ul>
  );
}
