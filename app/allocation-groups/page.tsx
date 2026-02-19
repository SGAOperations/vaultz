'use client';

import { useEffect, useState } from 'react';

import { useDesignation } from '@/contexts/DesignationContext';
import { Loader2, Plus } from 'lucide-react';

import { getAllAllocationGroups } from '@/prisma/services/allocation-groups';

import { AllocationGroupWithAllocations } from '@/lib/types';

import { AllocationGroupCard } from '@/components/allocation-group-card';
import { CreateAllocationGroupDialog } from '@/components/create-allocation-group-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

export default function AllocationGroups() {
  const { activeDesignation } = useDesignation();
  const [allocationGroups, setAllocationGroups] = useState<
    AllocationGroupWithAllocations[]
  >([]);
  const [loadedDesignationId, setLoadedDesignationId] = useState<
    string | undefined
  >(undefined);
  const isLoading = loadedDesignationId !== activeDesignation?.id;

  useEffect(() => {
    let isCancelled = false;
    getAllAllocationGroups(activeDesignation?.id)
      .then((groups) => {
        if (!isCancelled) {
          setAllocationGroups(groups);
          setLoadedDesignationId(activeDesignation?.id);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setAllocationGroups([]);
          setLoadedDesignationId(activeDesignation?.id);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [activeDesignation?.id]);

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Allocation Groups"
        description="Organize and manage your budget allocations"
        actions={
          activeDesignation ? (
            <CreateAllocationGroupDialog
              designationId={activeDesignation.id}
              trigger={
                <Button className="gap-2 shadow-sm">
                  <Plus className="size-4" />
                  Create Allocation Group
                </Button>
              }
            />
          ) : null
        }
      />

      {!activeDesignation ? (
        <EmptyState
          message="No designation selected"
          description="Select a designation to view allocation groups"
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : allocationGroups.length === 0 ? (
        <EmptyState
          message="No allocation groups yet"
          description="Create your first allocation group to organize your budget"
        />
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {allocationGroups.map((v, i) => (
            <AllocationGroupCard key={i} allocationGroup={v} />
          ))}
        </div>
      )}
    </div>
  );
}
