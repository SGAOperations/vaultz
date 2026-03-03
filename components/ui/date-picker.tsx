'use client';

import { useState } from 'react';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { DateTime } from '@/components/date-time';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger } from '@/components/ui/popover';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    const parsed = parseDateInput(raw);
    if (parsed) onChange(parsed);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) setInputValue(date ? formatDateInput(date) : '');
    setOpen(newOpen);
  };

  const currentYear = new Date().getFullYear();

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr h-4 w-4" />
          {date ? <DateTime date={date} dateOnly /> : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Content
        className={cn(
          'bg-popover text-popover-foreground z-50 w-auto origin-(--radix-popover-content-transform-origin) rounded-md border p-0 shadow-md outline-hidden',
        )}
        align="start"
        sideOffset={4}
        avoidCollisions={false}
      >
        <div className="border-b p-3">
          <Input
            placeholder="MM/DD/YYYY"
            value={inputValue}
            onChange={handleInputChange}
            aria-invalid={inputValue !== '' && !parseDateInput(inputValue)}
          />
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
          captionLayout="dropdown"
          fromYear={currentYear - 25}
          toYear={currentYear + 25}
        />
      </PopoverPrimitive.Content>
    </Popover>
  );
}
