import { CreditCard, RefreshCw } from 'lucide-react';

import { Designation } from '@/prisma/client';

import { EditDesignationDialog } from '@/components/edit-designation-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DesignationCard({ designation }: { designation: Designation }) {
  const { id, name, code, budgetResetBehavior } = designation;

  return (
    <Card className="h-full gap-2">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
              <CreditCard className="text-primary size-5" />
            </div>
            <div>
              <CardTitle>{name}</CardTitle>
              <p className="text-muted-foreground font-mono text-xs">
                DN{code}
              </p>
            </div>
          </div>
          <EditDesignationDialog
            designationId={id}
            name={name}
            code={code}
            budgetResetBehavior={budgetResetBehavior}
            trigger={
              <Button variant="outline" size="sm">
                Edit
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className={`flex items-start gap-3 rounded-lg border p-3 ${budgetResetBehavior === 'ROLLOVER' ? 'border-primary/20 bg-primary/5' : 'bg-muted/50'}`}
        >
          <RefreshCw className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-sm font-medium">
              {budgetResetBehavior === 'ROLLOVER' ? 'Rollover' : 'Reset'}
            </p>
            <p className="text-muted-foreground text-xs">
              {budgetResetBehavior === 'ROLLOVER'
                ? "Unused funds from previous year added to next year's budgets."
                : 'Category budgets start fresh each year. Unused funds are not carried forward.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
