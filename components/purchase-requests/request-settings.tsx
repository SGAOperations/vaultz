'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Loader2, Plus, Trash2 } from 'lucide-react';

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
  users: (PersonName & { isEBoardPurchaser: boolean })[];
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
            {user.first} {user.last}
          </label>
        </li>
      ))}
    </ul>
  );
}
