'use client';

import { useEffect, useState } from 'react';

import {
  Calendar as CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';

function formatDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

const MIN_VALID_YEAR = 1000;

function parseDateInput(input: string): Date | undefined {
  const parts = input.split('/');
  if (parts.length !== 3) return undefined;
  const [month, day, year] = parts.map(Number);
  if (!month || !day || !year || year < MIN_VALID_YEAR) return undefined;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
    return date;
  return undefined;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function DatePicker({
  value,
  onChange,
}: {
  value?: Date;
  onChange: (value: Date) => void;
}) {
  const date = value ? new Date(value) : undefined;
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    date ? formatDateInput(date) : '',
  );
  const [viewedDate, setViewedDate] = useState(() => date ?? new Date());

  // Any pointerdown that bubbles to the document originated outside both the
  // trigger button and the calendar panel (both call stopPropagation).
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    const parsed = parseDateInput(raw);
    if (parsed) {
      onChange(parsed);
      setViewedDate(parsed);
    }
  };

  const handleToggle = () => {
    if (!open) {
      setInputValue(date ? formatDateInput(date) : '');
      setViewedDate(date ?? new Date());
    }
    setOpen((prev) => !prev);
  };

  const currentYear = new Date().getFullYear();
  const YEARS_BEFORE = 25;
  const YEAR_COUNT = 51;
  const years = Array.from(
    { length: YEAR_COUNT },
    (_, i) => currentYear - YEARS_BEFORE + i,
  );

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className={cn(
          'w-full justify-start text-left font-normal',
          !date && 'text-muted-foreground',
        )}
        onClick={handleToggle}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? <DateTime date={date} dateOnly /> : <span>Pick a date</span>}
      </Button>
      {open && (
        <div
          className="bg-popover text-popover-foreground absolute left-0 top-full z-50 mt-1 w-auto rounded-md border p-0 shadow-md"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="border-b p-3">
            <Input
              placeholder="MM/DD/YYYY"
              value={inputValue}
              onChange={handleInputChange}
              aria-invalid={inputValue !== '' && !parseDateInput(inputValue)}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() =>
                setViewedDate(
                  (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                )
              }
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <div className="flex items-center gap-1 text-sm font-medium">
              <select
                className="cursor-pointer appearance-none bg-transparent focus:outline-none"
                value={viewedDate.getMonth()}
                onChange={(e) =>
                  setViewedDate(
                    (d) => new Date(d.getFullYear(), Number(e.target.value), 1),
                  )
                }
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                className="cursor-pointer appearance-none bg-transparent focus:outline-none"
                value={viewedDate.getFullYear()}
                onChange={(e) =>
                  setViewedDate(
                    (d) => new Date(Number(e.target.value), d.getMonth(), 1),
                  )
                }
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() =>
                setViewedDate(
                  (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                )
              }
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                onChange(newDate);
                setInputValue(formatDateInput(newDate));
                setOpen(false);
              }
            }}
            month={viewedDate}
            onMonthChange={setViewedDate}
            classNames={{
              month_caption: 'hidden',
              nav: 'hidden',
            }}
          />
        </div>
      )}
    </div>
  );
}
