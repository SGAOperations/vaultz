'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { z } from 'zod/v4';

import { createCategory } from '@/prisma/services/category';
import {
  getCategoriesNotInYear,
  updateCategoryYearBudget,
} from '@/prisma/services/category-year';

import { handleError, isError } from '@/lib/utils';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
} from '@/components/ui/form';
import { FormInput } from '@/components/ui/form-input';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const newSchema = z.object({
  designationId: z.string().min(1, 'Please select a designation'),
  code: z
    .string()
    .length(3, 'Must be exactly 3 numbers')
    .regex(/^\d{3}$/, 'Must be 3 numeric digits'),
  ledgerCode: z.string().length(4, 'Must be exactly 4 characters long'),
  name: z.string().min(1, 'Please enter a category name'),
  amount: z.coerce.number<number>().min(0, 'Must be ≥ 0'),
});

type NewFormData = z.infer<typeof newSchema>;

interface CreateCategoryDialogProps {
  designationId: string;
  trigger: React.ReactNode;
  yearId?: string;
  yearName?: string;
}

export function CreateCategoryDialog({
  designationId,
  trigger,
  yearId,
  yearName,
}: CreateCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'new' | 'existing'>('new');
  const [existingCategories, setExistingCategories] = useState<
    { id: string; code: string; ledgerCode: string; name: string }[]
  >([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [existingAmount, setExistingAmount] = useState('0');
  const [isAddingExisting, setIsAddingExisting] = useState(false);
  const [confirmPastYear, setConfirmPastYear] = useState(false);

  const queryClient = useQueryClient();

  const form = useForm<NewFormData>({
    resolver: zodResolver(newSchema),
    defaultValues: { designationId, code: '', ledgerCode: '', name: '', amount: 0 },
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (!open || !yearId) return;
    getCategoriesNotInYear({ designationId, yearId })
      .then(setExistingCategories)
      .catch(() => setExistingCategories([]));
  }, [open, designationId, yearId]);

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset({ designationId, code: '', ledgerCode: '', name: '', amount: 0 });
      setTab('new');
      setSelectedCategoryId('');
      setExistingAmount('0');
      setExistingCategories([]);
      setConfirmPastYear(false);
    }
  }

  async function onSubmitNew(data: NewFormData) {
    const result = await handleError(
      createCategory({
        designationId: data.designationId,
        code: data.code,
        ledgerCode: data.ledgerCode,
        name: data.name,
        yearId,
        amount: data.amount,
      }),
      {
        toast: {
          loading: 'Creating spending category...',
          success: 'Spending category created successfully',
          error: 'Failed to create spending category',
        },
      },
    );
    if (!isError(result)) {
      await queryClient.invalidateQueries({ queryKey: ['categories-budget'] });
      handleOpenChange(false);
    }
  }

  async function onAddExisting(force?: boolean) {
    if (!yearId || !selectedCategoryId) return;
    setIsAddingExisting(true);

    if (!force) {
      // First attempt: call directly so we can silently intercept the past-year error
      const result = await updateCategoryYearBudget({
        categoryId: selectedCategoryId,
        yearId,
        amount: Number(existingAmount) || 0,
      });
      setIsAddingExisting(false);
      if (isError(result)) {
        if (result.error.includes('is a past year with')) {
          setConfirmPastYear(true);
        } else {
          toast.error(result.error);
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['categories-budget'] });
      handleOpenChange(false);
      return;
    }

    // Force add after past-year confirmation
    const result = await handleError(
      updateCategoryYearBudget({
        categoryId: selectedCategoryId,
        yearId,
        amount: Number(existingAmount) || 0,
        force: true,
      }),
      {
        toast: {
          loading: 'Adding category to year...',
          success: 'Category added to year successfully',
          error: 'Failed to add category to year',
        },
      },
    );
    setIsAddingExisting(false);
    if (!isError(result)) {
      await queryClient.invalidateQueries({ queryKey: ['categories-budget'] });
      handleOpenChange(false);
    }
  }

  const showTabs = !!yearId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Spending Category</DialogTitle>
          <DialogDescription>Each spending category has a set budget.</DialogDescription>
        </DialogHeader>

        {showTabs ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'new' | 'existing')}>
            <TabsList>
              <TabsTrigger value="new">New Category</TabsTrigger>
              <TabsTrigger value="existing">Add Existing</TabsTrigger>
            </TabsList>

            <TabsContent value="new">
              <NewCategoryForm
                form={form}
                isSubmitting={isSubmitting}
                yearName={yearName}
                onSubmit={onSubmitNew}
                onCancel={() => handleOpenChange(false)}
              />
            </TabsContent>

            <TabsContent value="existing">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                      Select a category that exists in another year to add it to{' '}
                      <span className="font-medium">{yearName}</span>.
                    </p>
                    <Combobox
                      name="category"
                      data={[
                        {
                          items: existingCategories.map((c) => ({
                            value: c.id,
                            label: `SC${c.code} — ${c.name}`,
                          })),
                        },
                      ]}
                      value={selectedCategoryId}
                      onChange={setSelectedCategoryId}
                      disabled={existingCategories.length === 0}
                    />
                    {existingCategories.length === 0 && (
                      <p className="text-muted-foreground text-sm">
                        All categories are already in {yearName}.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Budget for {yearName}
                    </label>
                    <div className="flex items-center">
                      <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-l-md border border-r-0 px-3 text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        className="rounded-l-none"
                        value={existingAmount}
                        onChange={(e) => setExistingAmount(e.target.value)}
                        disabled={!selectedCategoryId}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (confirmPastYear) setConfirmPastYear(false);
                      else handleOpenChange(false);
                    }}
                    disabled={isAddingExisting}
                  >
                    {confirmPastYear ? 'Back' : 'Cancel'}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    variant={confirmPastYear ? 'destructive' : 'default'}
                    onClick={() => onAddExisting(confirmPastYear || undefined)}
                    disabled={!selectedCategoryId || isAddingExisting}
                  >
                    {isAddingExisting && <Loader2 className="animate-spin" />}
                    {confirmPastYear ? 'Confirm Add' : `Add to ${yearName}`}
                  </Button>
                </div>
                {confirmPastYear && (
                  <p className="text-destructive text-sm">
                    This is a past year. Adding a category will modify historical budget data. Are you sure?
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <NewCategoryForm
            form={form}
            isSubmitting={isSubmitting}
            onSubmit={onSubmitNew}
            onCancel={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewCategoryForm({
  form,
  isSubmitting,
  yearName,
  onSubmit,
  onCancel,
}: {
  form: ReturnType<typeof useForm<NewFormData>>;
  isSubmitting: boolean;
  yearName?: string;
  onSubmit: (data: NewFormData) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
        <FormInput<NewFormData> name="name" label="Name" placeholder="Food" />
        <FormInput<NewFormData>
          name="code"
          label="Spending Category Code"
          placeholder="123"
          prefix="SC"
          numbersOnly
          maxLength={3}
          description="The spending category code associated with this category."
        />
        <FormInput<NewFormData>
          name="ledgerCode"
          label="Ledger Code"
          placeholder="7XXX"
          description="The ledger code to be associated with this category."
        />
        {yearName && (
          <FormInput<NewFormData>
            name="amount"
            label={`Budget for ${yearName}`}
            placeholder="0.00"
            currency
            type="number"
            min={0}
            step="0.01"
          />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Create
          </Button>
        </div>
      </form>
    </Form>
  );
}
