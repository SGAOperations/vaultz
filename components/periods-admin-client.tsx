'use client';

import { useState } from 'react';

import { AlertTriangle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import { Period, Year } from '@/prisma/client';
import { deletePeriod, deleteYear } from '@/prisma/services/period';

import { handleError } from '@/lib/utils';

import { PeriodDialog } from '@/components/period-dialog';
import { YearDialog } from '@/components/year-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { DateTime } from './date-time';

type YearWithPeriods = Year & { periods: Period[] };

function isActive(startDate: Date, endDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  return start <= today && end >= today;
}

function ActiveBadge() {
  return (
    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
      Active
    </span>
  );
}

function PeriodRow({
  period,
  years,
}: {
  period: Period;
  years: Year[];
}) {
  const [deleting, setDeleting] = useState(false);
  const active = isActive(period.startDate, period.endDate);

  async function handleDelete() {
    setDeleting(true);
    await handleError(deletePeriod({ id: period.id }), {
      toast: {
        loading: 'Deleting period...',
        success: 'Period deleted',
        error: 'Failed to delete period',
      },
    });
    setDeleting(false);
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{period.name}</span>
            {active && <ActiveBadge />}
          </div>
          <span className="text-muted-foreground text-xs">
            <DateTime date={period.startDate} dateOnly /> –{' '}
            <DateTime date={period.endDate} dateOnly />
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <PeriodDialog period={period} years={years}>
          <Button variant="ghost" size="icon">
            <Pencil className="size-4" />
            <span className="sr-only">Edit period</span>
          </Button>
        </PeriodDialog>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          <span className="sr-only">Delete period</span>
        </Button>
      </div>
    </div>
  );
}

function YearCard({
  year,
  allYears,
}: {
  year: YearWithPeriods;
  allYears: Year[];
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const active = isActive(year.startDate, year.endDate);

  async function handleDelete() {
    setDeleting(true);
    await handleError(deleteYear({ id: year.id }), {
      toast: {
        loading: 'Deleting year...',
        success: 'Year deleted',
        error: 'Failed to delete year',
      },
    });
    setDeleting(false);
    setConfirmOpen(false);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2 text-base">
                {year.name}
                {active && <ActiveBadge />}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                <DateTime date={year.startDate} dateOnly /> –{' '}
                <DateTime date={year.endDate} dateOnly />
              </p>
            </div>

            <div className="flex items-center gap-2">
              <YearDialog year={year}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              </YearDialog>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-2">
          {year.periods.length === 0 ? (
            <p className="text-muted-foreground text-sm">No periods yet.</p>
          ) : (
            year.periods.map((period) => (
              <PeriodRow key={period.id} period={period} years={allYears} />
            ))
          )}

          <PeriodDialog years={allYears} defaultYearId={year.id}>
            <Button variant="outline" size="sm" className="mt-2 gap-1.5 self-start">
              <Plus className="size-3.5" />
              Add Period
            </Button>
          </PeriodDialog>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-5" />
              Delete Year
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{year.name}</strong>? This
              action cannot be undone. Deletion will be blocked if purchases or
              transfers exist for this year.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting && <Loader2 className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PeriodsAdminClient({
  years,
}: {
  years: YearWithPeriods[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {years.map((year) => (
        <YearCard key={year.id} year={year} allYears={years} />
      ))}
    </div>
  );
}
