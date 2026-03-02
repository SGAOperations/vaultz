'use client';

import { Plus } from 'lucide-react';

import { CreateProcessTemplateDialog } from '@/components/create-process-template-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

import { Content } from './content';

export default function ProcessesPage() {
  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Process Templates"
        description="Manage reusable process templates for tracking purchases · Global"
        actions={
          <CreateProcessTemplateDialog
            trigger={
              <Button className="gap-2 shadow-sm">
                <Plus className="size-4" />
                Create Template
              </Button>
            }
          />
        }
      />
      <Content />
    </div>
  );
}
