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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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

  async function onAddExisting() {
    if (!yearId || !selectedCategoryId) return;
    setIsAddingExisting(true);
    const result = await handleError(
      updateCategoryYearBudget({
        categoryId: selectedCategoryId,
        yearId,
        amount: Number(existingAmount) || 0,
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
                    <div className="relative">
                      <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
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
                    onClick={() => handleOpenChange(false)}
                    disabled={isAddingExisting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={onAddExisting}
                    disabled={!selectedCategoryId || isAddingExisting}
                  >
                    {isAddingExisting && <Loader2 className="animate-spin" />}
                    Add to {yearName}
                  </Button>
                </div>
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Food" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Spending Category Code</FormLabel>
              <FormControl>
                <Input placeholder="123" {...field} />
              </FormControl>
              <FormDescription>
                Enter 3 numbers (displayed with SC prefix, e.g., SC123).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ledgerCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ledger Code</FormLabel>
              <FormControl>
                <Input placeholder="7XXX" {...field} />
              </FormControl>
              <FormDescription>
                The ledger code to be associated with this category.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {yearName && (
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget for {yearName}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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

