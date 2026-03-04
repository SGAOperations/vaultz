'use client';

import { useEffect, useState } from 'react';

import {
  Calendar as CalendarIcon,
  ChevronDownIcon,
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

// Custom dropdown that uses only React state — no native <select> to avoid
// Radix Dialog FocusScope conflicts.
function NavDropdown({
  options,
  value,
  onChange,
  open,
  onToggle,
}: {
  options: Array<{ value: number; label: string }>;
  value: number;
  onChange: (value: number) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const label = options.find((o) => o.value === value)?.label ?? String(value);
  return (
    // stopPropagation prevents the calendar panel's pointerdown handler from
    // closing this dropdown when the user interacts with it.
    <div
      className="relative"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="flex items-center gap-0.5 rounded px-1 py-0.5 text-sm font-medium hover:bg-accent"
        onClick={onToggle}
      >
        {label}
        <ChevronDownIcon className="size-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[60] mt-1 max-h-48 min-w-[5.5rem] overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'w-full rounded px-2 py-1 text-left text-sm hover:bg-accent',
                opt.value === value && 'bg-accent font-medium',
              )}
              onClick={() => {
                onChange(opt.value);
                onToggle();
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  // 'month' | 'year' | null — which nav dropdown is currently open
  const [openDropdown, setOpenDropdown] = useState<'month' | 'year' | null>(
    null,
  );

  // Any pointerdown that bubbles all the way to document originated outside
  // both the trigger button and the calendar panel (both call stopPropagation).
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
      setOpenDropdown(null);
    }
    setOpen((prev) => !prev);
  };

  const currentYear = new Date().getFullYear();
  const YEARS_BEFORE = 25;
  const YEAR_COUNT = 51; // currentYear - 25 through currentYear + 25
  const yearOptions = Array.from({ length: YEAR_COUNT }, (_, i) => {
    const y = currentYear - YEARS_BEFORE + i;
    return { value: y, label: String(y) };
  });
  const monthOptions = MONTH_NAMES.map((name, i) => ({ value: i, label: name }));

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
        // Prevent this click from reaching the document listener so that
        // clicking the trigger while the calendar is open correctly toggles
        // it (without the listener racing to close it first).
        onPointerDown={(e) => e.stopPropagation()}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? <DateTime date={date} dateOnly /> : <span>Pick a date</span>}
      </Button>
      {open && (
        <div
          className="bg-popover text-popover-foreground absolute left-0 top-full z-50 mt-1 w-auto rounded-md border p-0 shadow-md"
          // Any pointerdown inside the panel is stopped here so it never
          // reaches the document listener (which would close the calendar).
          // Nav dropdowns add their own stopPropagation to prevent this
          // handler from closing them.
          onPointerDown={(e) => {
            e.stopPropagation();
            setOpenDropdown(null);
          }}
        >
          <div className="border-b p-3">
            <Input
              placeholder="MM/DD/YYYY"
              value={inputValue}
              onChange={handleInputChange}
              aria-invalid={inputValue !== '' && !parseDateInput(inputValue)}
            />
          </div>
          {/* Custom navigation — replaces the Calendar's built-in caption/nav
              so we can use React-state dropdowns instead of native <select>. */}
          <div className="flex items-center justify-between px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() =>
                // Day 1 is intentional — viewedDate only controls which month
                // is displayed; the day value is irrelevant to the calendar.
                setViewedDate(
                  (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                )
              }
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <div className="flex items-center gap-1">
              <NavDropdown
                options={monthOptions}
                value={viewedDate.getMonth()}
                onChange={(m) =>
                  setViewedDate((d) => new Date(d.getFullYear(), m, 1))
                }
                open={openDropdown === 'month'}
                onToggle={() =>
                  setOpenDropdown(openDropdown === 'month' ? null : 'month')
                }
              />
              <NavDropdown
                options={yearOptions}
                value={viewedDate.getFullYear()}
                onChange={(y) =>
                  setViewedDate((d) => new Date(y, d.getMonth(), 1))
                }
                open={openDropdown === 'year'}
                onToggle={() =>
                  setOpenDropdown(openDropdown === 'year' ? null : 'year')
                }
              />
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
              // Hide the built-in caption and nav — our custom header above
              // handles navigation without any native <select> elements.
              month_caption: 'hidden',
              nav: 'hidden',
            }}
          />
        </div>
      )}
    </div>
  );
}
