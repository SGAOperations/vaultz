'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  AssignablePositions,
  DivisionAccessRow,
  addDivisionAccess,
  removeDivisionAccess,
} from '@/prisma/services/division-access';

import { addDivisionAccessSchema } from '@/lib/division-access';
import { groupByDesignation, handleError, isError } from '@/lib/utils';

import { SectionHeader } from '@/components/section-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';

interface DivisionAccessEditorProps {
  divisions: DivisionAccessRow[];
  positions: AssignablePositions;
}

export function DivisionAccessEditor({
  divisions,
  positions,
}: DivisionAccessEditorProps) {
  return (
    <>
      {groupByDesignation(divisions).map(({ designationId, title, items }) => (
        <section key={designationId} className="flex flex-col">
          <SectionHeader title={title} />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {items.map((division) => (
              <DivisionAccessCard
                key={division.id}
                division={division}
                positions={positions}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function DivisionAccessCard({
  division,
  positions,
}: {
  division: DivisionAccessRow;
  positions: AssignablePositions;
}) {
  const router = useRouter();
  const assigned = new Set(division.assignments.map((a) => a.positionKey));
  const options = [
    { heading: 'View positions', keys: positions.viewPositions },
    { heading: 'Requester positions', keys: positions.requesterPositions },
  ]
    .map(({ heading, keys }) => ({
      heading,
      items: keys
        .filter((key) => !assigned.has(key))
        .map((key) => ({ label: key, value: key })),
    }))
    .filter((group) => group.items.length > 0);
  const [positionKey, setPositionKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    const input = { allocationGroupId: division.id, positionKey };
    const parsed = addDivisionAccessSchema.safeParse(input);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid position key.');
      return;
    }

    setBusy(true);
    const result = await handleError(addDivisionAccess(input), {
      toast: {
        loading: 'Assigning position...',
        success: `Assigned to ${division.name}`,
      },
    }).finally(() => setBusy(false));
    if (isError(result)) return;
    setPositionKey('');
    router.refresh();
  }

  async function remove(id: string, key: string) {
    setRemovingId(id);
    const result = await handleError(removeDivisionAccess({ id }), {
      toast: {
        loading: 'Removing position...',
        success: `Removed ${key} from ${division.name}`,
      },
    }).finally(() => setRemovingId(null));
    if (!isError(result)) router.refresh();
  }

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4">
      <h3
        className="truncate font-semibold tracking-tight"
        title={division.name}
      >
        {division.name}
      </h3>

      {division.assignments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No positions assigned. Only editors can see this division.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {division.assignments.map((a) => (
            <li
              key={a.id}
              className="bg-muted flex max-w-full items-center gap-1 rounded-md py-0.5 pr-0.5 pl-2"
            >
              <code className="truncate text-xs">{a.positionKey}</code>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                aria-label={`Remove ${a.positionKey} from ${division.name}`}
                disabled={removingId === a.id}
                onClick={() => remove(a.id, a.positionKey)}
              >
                {removingId === a.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Combobox
            name="position"
            data={options}
            value={positionKey}
            onChange={setPositionKey}
            disabled={busy || options.length === 0}
          />
        </div>
        <Button
          type="submit"
          disabled={busy || !positionKey}
          className="shrink-0 gap-2"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          Assign
        </Button>
      </form>
    </Card>
  );
}
