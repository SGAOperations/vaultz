'use client';

import { ChevronsUpDown } from 'lucide-react';

import { useDesignation } from '@/contexts/DesignationContext';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DesignationSwitcher() {
  const { activeDesignation, designations, setDesignation } = useDesignation();

  if (designations.length === 0) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="gap-1.5">
          <span className="max-w-[120px] truncate">
            {activeDesignation?.name}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Designations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={activeDesignation?.id ?? ''}
          onValueChange={(value) => {
            const designation = designations.find((d) => d.id === value);
            if (designation) setDesignation(designation);
          }}
        >
          {designations.map((designation) => (
            <DropdownMenuRadioItem key={designation.id} value={designation.id}>
              {designation.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
