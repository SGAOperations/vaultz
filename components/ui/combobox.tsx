'use client';

import * as React from 'react';

import { fuzzy } from 'fast-fuzzy';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function Combobox({
  data,
  value,
  onChange,
  name,
  disabled = false,
  onCreate,
}: {
  data: { heading?: string; items: { label: string; value: string }[] }[];
  value?: string;
  onChange: (value: string) => void;
  name: string;
  disabled?: boolean;
  onCreate?: (searchTerm: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value
            ? data.flatMap((v) => v.items).find((v) => v.value === value)?.label
            : `Select ${name}...`}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command
          filter={(_, search, keywords) => {
            return search && keywords ? fuzzy(keywords[0], search) - 0.1 : 0;
          }}
        >
          <CommandInput 
            placeholder={`Search ${name}s...`} 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {onCreate && search ? (
                <CommandItem
                  onSelect={() => {
                    onCreate(search);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="cursor-pointer justify-center"
                >
                  Create &quot;{search}&quot;
                </CommandItem>
              ) : (
                `No ${name} found.`
              )}
            </CommandEmpty>
            {data.map((v, i) => (
              <CommandGroup key={i} heading={v.heading}>
                {v.items.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? '' : currentValue);
                      setOpen(false);
                      setSearch('');
                    }}
                    keywords={[item.label]}
                  >
                    <CheckIcon
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === item.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
