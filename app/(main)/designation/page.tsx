import { Plus } from 'lucide-react';

import { getDesignations } from '@/prisma/services/designation';

import { CreateDesignationDialog } from '@/components/create-designation-dialog';
import { DesignationCard } from '@/components/designation-card';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

export default async function DesignationsPage() {
  const designations = await getDesignations();

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Designations"
        description="Configure your financial designations and their budget behavior · Global"
        actions={
          <CreateDesignationDialog
            trigger={
              <Button className="gap-2 shadow-sm">
                <Plus className="size-4" />
                Create Designation
              </Button>
            }
          />
        }
      />

      {designations.length === 0 ? (
        <EmptyState
          message="No designations yet"
          description="Create your first designation to start tracking purchases"
        />
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {designations.map((designation) => (
            <DesignationCard key={designation.id} designation={designation} />
          ))}
        </div>
      )}
    </div>
  );
}
