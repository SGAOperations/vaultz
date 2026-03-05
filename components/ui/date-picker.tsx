'use client';

import * as React from 'react';
import { useState } from 'react';
import { DayButton, getDefaultClassNames } from 'react-day-picker';

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
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);

function PickerDayButton({
  className,
  modifiers,
  onMouseDown: onMouseDownProp,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  return (
    <Button
      variant="ghost"
      size="icon"
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal focus-visible:border-transparent focus-visible:ring-0 [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDownProp?.(e as React.MouseEvent<HTMLButtonElement>);
      }}
      {...props}
    />
  );
}

const CALENDAR_COMPONENTS = { DayButton: PickerDayButton };

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
  const [openDropdown, setOpenDropdown] = useState<'month' | 'year' | null>(
    null,
  );

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
        <>
          {/* Calendar panel — all content is inline, no portals */}
          <div
            className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 w-auto rounded-md border p-0 shadow-md"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setOpenDropdown(null)}
          >
            <div className="border-b p-3" onClick={(e) => e.stopPropagation()}>
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

              <div className="flex items-center gap-1">
                {/* Month dropdown — inline, no portal */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-sm font-medium"
                    onClick={() =>
                      setOpenDropdown(openDropdown === 'month' ? null : 'month')
                    }
                  >
                    {MONTH_NAMES[viewedDate.getMonth()]}
                    <ChevronDownIcon className="size-3 opacity-60" />
                  </Button>
                  {openDropdown === 'month' && (
                    <div className="bg-popover text-popover-foreground absolute top-full left-0 z-10 max-h-60 min-w-36 overflow-y-auto rounded-md border p-1 shadow-md">
                      {MONTH_NAMES.map((name, i) => (
                        <div
                          key={i}
                          className={cn(
                            'hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm px-2 py-1.5 text-sm',
                            viewedDate.getMonth() === i &&
                              'bg-accent text-accent-foreground',
                          )}
                          onClick={() => {
                            setViewedDate(
                              (d) => new Date(d.getFullYear(), i, 1),
                            );
                            setOpenDropdown(null);
                          }}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Year dropdown — inline, no portal */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-sm font-medium"
                    onClick={() =>
                      setOpenDropdown(openDropdown === 'year' ? null : 'year')
                    }
                  >
                    {viewedDate.getFullYear()}
                    <ChevronDownIcon className="size-3 opacity-60" />
                  </Button>
                  {openDropdown === 'year' && (
                    <div className="bg-popover text-popover-foreground absolute top-full left-0 z-10 max-h-60 min-w-24 overflow-y-auto rounded-md border p-1 shadow-md">
                      {YEARS.map((y) => (
                        <div
                          key={y}
                          className={cn(
                            'hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm px-2 py-1.5 text-sm',
                            viewedDate.getFullYear() === y &&
                              'bg-accent text-accent-foreground',
                          )}
                          onClick={() => {
                            setViewedDate((d) => new Date(y, d.getMonth(), 1));
                            setOpenDropdown(null);
                          }}
                        >
                          {y}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
              classNames={{ month_caption: 'hidden', nav: 'hidden' }}
              components={CALENDAR_COMPONENTS}
            />
          </div>
        </>
      )}
    </div>
  );
}
