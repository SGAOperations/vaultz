'use client';

import { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  StickyNote,
  Tag,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod/v4';

import { User } from '@/prisma/client';
import {
  createPurchase,
  deletePurchase,
  updatePurchase,
} from '@/prisma/services/purchase';

import {
  Allocation,
  AllocationGroupWithAllocations,
  CategoryWithDesignation,
  PurchaseWithUser,
  YearRecord,
} from '@/lib/types';
import { UploadDropzone } from '@/lib/uploadthing';
import {
  formatCurrency,
  getFileUrl,
  handleError,
  parseDateOnly,
} from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { DateTime } from './date-time';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Combobox } from './ui/combobox';
import { DatePicker } from './ui/date-picker';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { FormInput } from './ui/form-input';
import { Textarea } from './ui/textarea';

const schema = z.object({
  userId: z.string().min(1, 'Please select a user'),
  categoryId: z.string().min(1, 'Please select a category'),
  allocationId: z.string().optional(),
  yearId: z.string().min(1, 'Please select a year'),
  description: z.string().min(1, 'Please enter a description'),
  amount: z.coerce
    .number<number>()
    .refine((val: number) => val !== 0, 'Amount cannot be $0.00')
    .refine(
      (val: number) => Math.abs(val) >= 0.01,
      'Absolute value must be at least $0.01',
    )
    .refine(
      (val: number) => Math.abs(Math.round(val * 100) - val * 100) < 0.001,
      'Must contain at most 2 decimal places',
    ),
  purchasedAt: z.date('Please select a valid date'),
  receipts: z.array(z.string()).optional(),
  excludeFromTotal: z.boolean().optional(),
  expenseReportCreated: z.boolean().optional(),
  reimbursed: z.boolean().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// Props for creating a new purchase (no existing purchase)
type CreatePurchaseProps = {
  mode: 'create';
  trigger?: React.ReactNode;
  purchase?: never;
  users: User[];
  categories: CategoryWithDesignation[];
  allocationGroups?: AllocationGroupWithAllocations[];
  miscAllocations?: Allocation[];
  years: YearRecord[];
  activeYearId?: string;
};

// Props for viewing/editing an existing purchase
type ViewEditPurchaseProps = {
  mode?: 'view';
  trigger: React.ReactNode;
  purchase: PurchaseWithUser;
  users: User[];
  categories: CategoryWithDesignation[];
  allocationGroups: AllocationGroupWithAllocations[];
  miscAllocations: Allocation[];
  years: YearRecord[];
  activeYearId?: string;
};

type PurchaseDialogProps = CreatePurchaseProps | ViewEditPurchaseProps;

export function PurchaseDialog(props: PurchaseDialogProps) {
  const {
    users,
    categories,
    allocationGroups = [],
    miscAllocations = [],
    years,
    activeYearId,
  } = props;

  const isCreateMode = props.mode === 'create';
  const purchase = isCreateMode ? null : props.purchase;

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filesUploaded, setFilesUploaded] = useState<string[]>([]);
  const [receiptsToDisplay, setReceiptsToDisplay] = useState<string[]>(
    purchase?.receipts || [],
  );
  const [pendingYearId, setPendingYearId] = useState<string | null>(null);
  const [yearWarningOpen, setYearWarningOpen] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const receiptUrls = purchase?.receipts.map((r) => getFileUrl(r)) || [];

  // Lookup category and allocation names for display (memoized for performance)
  const categoryName = useMemo(
    () =>
      purchase
        ? categories.find((c) => c.id === purchase.categoryId)?.name
        : undefined,
    [purchase, categories],
  );

  const allocationName = useMemo(() => {
    if (!purchase?.allocationId) return undefined;
    const allAllocations = [
      ...allocationGroups.flatMap((g) => g.allocations),
      ...miscAllocations,
    ];
    return allAllocations.find((a) => a.id === purchase.allocationId)?.name;
  }, [purchase, allocationGroups, miscAllocations]);

  const purchaseYear = useMemo(
    () => (purchase ? years.find((y) => y.id === purchase.yearId) : undefined),
    [purchase, years],
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: purchase?.userId || '',
      categoryId:
        purchase?.categoryId ||
        (categories.length === 1 ? categories[0].id : ''),
      allocationId: purchase?.allocationId || '',
      yearId: purchase?.yearId || activeYearId || '',
      description: purchase?.description || '',
      amount: purchase?.amount || 0,
      purchasedAt: purchase ? parseDateOnly(purchase.purchasedAt) : new Date(),
      receipts: purchase?.receipts || [],
      excludeFromTotal: purchase?.excludeFromTotal || false,
      expenseReportCreated: purchase?.expenseReportCreated || false,
      reimbursed: purchase?.reimbursed || false,
      notes: purchase?.notes ?? '',
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  function handleYearChange(yearId: string) {
    if (!yearId || yearId === activeYearId) {
      form.setValue('yearId', yearId, { shouldValidate: true });
      return;
    }
    const selectedYear = years.find((y) => y.id === yearId);
    if (!selectedYear) {
      form.setValue('yearId', yearId, { shouldValidate: true });
      return;
    }
    setPendingYearId(yearId);
    setYearWarningOpen(true);
  }

  function confirmYearChange() {
    if (pendingYearId)
      form.setValue('yearId', pendingYearId, { shouldValidate: true });
    setPendingYearId(null);
    setYearWarningOpen(false);
  }

  function cancelYearChange() {
    setPendingYearId(null);
    setYearWarningOpen(false);
  }

  const pendingYear = years.find((y) => y.id === pendingYearId);
  const today = new Date();
  const yearWarningMessage = (() => {
    if (!pendingYear) return '';
    const endDate = parseDateOnly(pendingYear.endDate);
    const startDate = parseDateOnly(pendingYear.startDate);
    if (endDate < today)
      return `Creating purchase for ${pendingYear.name} which ended ${endDate.toLocaleDateString()}`;
    if (startDate > today)
      return `Creating purchase for ${pendingYear.name} which starts ${startDate.toLocaleDateString()}`;
    return '';
  })();

  async function onSubmit(data: FormData) {
    if (isCreateMode) {
      await handleError(createPurchase(data), {
        toast: {
          loading: 'Creating purchase...',
          success: 'Purchase created successfully',
          error: 'Failed to create purchase',
        },
        onSuccess: () => {
          form.reset();
          setFilesUploaded([]);
          setReceiptsToDisplay([]);
          setOpen(false);
        },
      });
    } else {
      await handleError(updatePurchase({ id: purchase!.id, ...data }), {
        toast: {
          loading: 'Updating purchase...',
          success: 'Purchase updated successfully',
          error: 'Failed to update purchase',
        },
        onSuccess: () => {
          setIsEditing(false);
          setOpen(false);
        },
      });
    }
  }

  async function handleDelete() {
    if (!purchase) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    await handleError(deletePurchase(purchase.id), {
      toast: {
        loading: 'Deleting purchase...',
        success: 'Purchase deleted successfully',
        error: 'Failed to delete purchase',
      },
      onSuccess: () => {
        setOpen(false);
      },
    });
  }

  function removeReceipt(receiptKey: string) {
    const currentReceipts = form.getValues('receipts') || [];
    form.setValue(
      'receipts',
      currentReceipts.filter((r) => r !== receiptKey),
    );
    setReceiptsToDisplay((prev) => prev.filter((r) => r !== receiptKey));
  }

  function handleCancel() {
    if (isCreateMode) {
      setOpen(false);
      form.reset();
      setFilesUploaded([]);
      setReceiptsToDisplay([]);
      setShowYearPicker(false);
      return;
    }

    setIsEditing(false);
    setConfirmDelete(false);
    setShowYearPicker(false);
    // Reset form to original values
    form.reset({
      userId: purchase!.userId,
      categoryId: purchase!.categoryId,
      allocationId: purchase!.allocationId || '',
      yearId: purchase!.yearId,
      description: purchase!.description,
      amount: purchase!.amount,
      purchasedAt: parseDateOnly(purchase!.purchasedAt),
      receipts: purchase!.receipts,
      excludeFromTotal: purchase!.excludeFromTotal,
      expenseReportCreated: purchase!.expenseReportCreated,
      reimbursed: purchase!.reimbursed,
      notes: purchase!.notes ?? '',
    });
    setReceiptsToDisplay(purchase!.receipts);
    setFilesUploaded([]);
  }

  function handleCancelDelete() {
    setConfirmDelete(false);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setIsEditing(isCreateMode);
      setConfirmDelete(false);
      form.reset();
      setReceiptsToDisplay(purchase?.receipts || []);
      setFilesUploaded([]);
      setShowYearPicker(false);
    }
  }

  const trigger = isCreateMode
    ? props.trigger || (
        <Button className="flex-1">
          <Plus />
          Create Purchase
        </Button>
      )
    : props.trigger;

  const dialogTitle = isCreateMode
    ? 'Create Purchase'
    : isEditing
      ? 'Edit Purchase'
      : 'Purchase Information';

  const dialogDescription = isCreateMode
    ? 'All purchases by the same individual should be attached to the same name.'
    : isEditing
      ? 'Update the details of this purchase or delete it entirely.'
      : 'See all of the details relevant to this purchase.';

  return (
    <>
      <Dialog open={yearWarningOpen} onOpenChange={(o) => !o && cancelYearChange()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Warning: Non-Active Year Selected</DialogTitle>
            <DialogDescription>{yearWarningMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={cancelYearChange}>
              Cancel
            </Button>
            <Button onClick={confirmYearChange}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
        className={
          isEditing
            ? 'flex max-h-[90vh] w-2/3 flex-col sm:max-w-full'
            : 'sm:max-w-full md:w-1/3'
        }
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>
            {!isEditing && purchase && (
              <div className="text-muted-foreground mr-5 hidden text-xs md:block">
                <span className="font-mono">{purchase.id}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {isEditing ? (
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-8 overflow-y-auto pr-1 pb-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Combobox
                            data={[
                              {
                                items: users.map((v) => ({
                                  value: v.id,
                                  label: `${v.first} ${v.last}`,
                                })),
                              },
                            ]}
                            {...field}
                            value={field.value || ''}
                            name="user"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormInput<FormData>
                    name="description"
                    label="Description"
                    placeholder="Enter a description"
                  />
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spending Category</FormLabel>
                        <FormControl>
                          <Combobox
                            data={Object.entries(
                              categories.reduce(
                                (acc, category) => {
                                  const group = category.designationId;
                                  acc[group] = acc[group] || { items: [] };
                                  acc[group].items.push({
                                    value: category.id,
                                    label: `${category.name} (SC${category.code})`,
                                  });
                                  return acc;
                                },
                                {} as Record<
                                  string,
                                  { items: { value: string; label: string }[] }
                                >,
                              ),
                            ).map(([designationId, group]) => ({
                              heading:
                                categories.find(
                                  (c) => c.designationId === designationId,
                                )?.designation.name || designationId,
                              ...group,
                            }))}
                            {...field}
                            name="category"
                            disabled={categories.length === 1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="allocationId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex gap-2">
                          <FormLabel>Allocation</FormLabel>
                          <FormDescription className="text-xs">
                            Optional
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Combobox
                            data={[
                              ...allocationGroups.map((group) => ({
                                heading: group.name,
                                items: group.allocations.map((allocation) => ({
                                  value: allocation.id,
                                  label: allocation.name,
                                })),
                              })),
                              ...(miscAllocations.length > 0
                                ? [
                                    {
                                      heading: 'Miscellaneous',
                                      items: miscAllocations.map(
                                        (allocation) => ({
                                          value: allocation.id,
                                          label: allocation.name,
                                        }),
                                      ),
                                    },
                                  ]
                                : []),
                            ]}
                            {...field}
                            name="allocation"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchasedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={
                              field.value ? new Date(field.value) : new Date()
                            }
                            onChange={(val: Date) => field.onChange(val)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormInput<FormData>
                    name="amount"
                    label="Amount"
                    placeholder="$21.45"
                    currency
                  />
                </div>
                <FormField
                  control={form.control}
                  name="yearId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <Calendar className="text-muted-foreground size-3.5" />
                        <span className="text-muted-foreground text-xs">
                          Fiscal Year:
                        </span>
                        <span className="text-xs font-medium">
                          {years.find((y) => y.id === field.value)?.name ??
                            'Not selected'}
                          {field.value === activeYearId && (
                            <span className="text-muted-foreground ml-1">
                              (Active)
                            </span>
                          )}
                        </span>
                        {years.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setShowYearPicker((v) => !v)}
                            className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-xs underline-offset-2 hover:underline"
                          >
                            change
                            <ChevronDown
                              className={`size-3 transition-transform ${showYearPicker ? 'rotate-180' : ''}`}
                            />
                          </button>
                        )}
                        <FormMessage className="text-xs" />
                      </div>
                      {showYearPicker && (
                        <FormControl>
                          <div className="mt-1 w-48">
                            <Combobox
                              data={[
                                {
                                  items: years.map((year) => ({
                                    value: year.id,
                                    label:
                                      year.id === activeYearId
                                        ? `${year.name} (Active)`
                                        : year.name,
                                  })),
                                },
                              ]}
                              value={field.value || ''}
                              onChange={(val) => {
                                handleYearChange(val);
                                setShowYearPicker(false);
                              }}
                              name="year"
                            />
                          </div>
                        </FormControl>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex gap-2">
                        <FormLabel>Notes</FormLabel>
                        <FormDescription className="text-xs">
                          Optional
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Add any notes about this purchase..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="receipts"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex gap-2">
                        <FormLabel>Receipts</FormLabel>
                        <FormDescription className="text-xs">
                          Optional
                        </FormDescription>
                      </div>
                      <FormControl>
                        <div className="space-y-2">
                          {receiptsToDisplay.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {receiptsToDisplay.map((receiptKey, i) => (
                                <div
                                  key={receiptKey}
                                  className="bg-muted flex items-center gap-2 rounded px-2 py-1"
                                >
                                  <a
                                    href={getFileUrl(receiptKey)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm hover:underline"
                                  >
                                    File {i + 1}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => removeReceipt(receiptKey)}
                                    className="hover:bg-accent rounded p-1"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <UploadDropzone
                            endpoint="receipts"
                            config={{ mode: 'auto', cn: twMerge }}
                            className="border-accent m-0 border p-4"
                            onClientUploadComplete={(data) => {
                              if (data.length === 0) return;

                              const newReceipts = data.map((d) => d.key);
                              const currentReceipts = field.value || [];
                              field.onChange([
                                ...currentReceipts,
                                ...newReceipts,
                              ]);
                              setReceiptsToDisplay((prev) => [
                                ...prev,
                                ...newReceipts,
                              ]);
                              setFilesUploaded((prev) => [
                                ...prev,
                                ...data.map((d) => d.name),
                              ]);
                            }}
                            onUploadError={(error) => {
                              if (
                                error.message ===
                                'Invalid config: FileSizeMismatch'
                              ) {
                                toast.error(
                                  'File upload failed. Please ensure your file is either an image smaller than 1MB or a PDF smaller than 512KB.',
                                );
                                return;
                              }
                              toast.error(
                                'There was an error uploading your file. Please contact an administrator for assistance.',
                              );
                            }}
                          />
                        </div>
                      </FormControl>
                      <div>
                        {filesUploaded.slice(0, 5).map((f, i) => (
                          <p className="text-muted-foreground text-sm" key={i}>
                            {f}
                          </p>
                        ))}
                        {filesUploaded.length > 5 && (
                          <p className="text-muted-foreground text-sm">
                            and {filesUploaded.length - 5} more...
                          </p>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="excludeFromTotal"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer font-normal">
                            Exclude from total
                          </FormLabel>
                        </div>
                        <FormDescription className="text-xs">
                          Exclude from budget calculations
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expenseReportCreated"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer font-normal">
                            Expense report created
                          </FormLabel>
                        </div>
                        <FormDescription className="text-xs">
                          Report has been filed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reimbursed"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer font-normal">
                            Reimbursed
                          </FormLabel>
                        </div>
                        <FormDescription className="text-xs">
                          Payment has been received
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-shrink-0 gap-2 border-t pt-4">
                {isCreateMode ? (
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    Submit
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={
                        confirmDelete ? handleCancelDelete : handleCancel
                      }
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {confirmDelete ? 'Cancel Delete' : 'Cancel'}
                    </Button>
                    {!confirmDelete && (
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        {isSubmitting && <Loader2 className="animate-spin" />}
                        Save Changes
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant={confirmDelete ? 'destructive' : 'outline'}
                      onClick={handleDelete}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {confirmDelete ? (
                        'Confirm Delete'
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </FormProvider>
        ) : (
          <>
            {/* Main Purchase Information with prominent badges */}
            <div className="space-y-6">
              {/* Primary Info - Amount and Description */}
              <div className="flex flex-wrap gap-3">
                <div className="bg-primary/10 ring-primary/20 flex items-center gap-3 rounded-lg px-4 py-3 ring-1">
                  <div className="bg-primary/20 flex size-10 items-center justify-center rounded-lg">
                    <DollarSign className="text-primary size-6" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Amount</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(purchase!.amount)}
                    </p>
                  </div>
                </div>

                {purchase!.description && (
                  <div className="bg-muted flex flex-1 items-center gap-3 rounded-lg px-4 py-3">
                    <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                      <FileText className="text-primary size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-xs">
                        Description
                      </p>
                      <p className="line-clamp-2 font-semibold">
                        {purchase!.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* All Badges - Ordered: Purchaser, Purchase Date, Category, Allocation, Created */}
              <div className="flex flex-wrap gap-3">
                {/* Purchaser */}
                <div className="bg-muted flex items-center gap-2 rounded-full px-4 py-2">
                  <UserIcon className="text-primary size-4" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Purchaser:</span>{' '}
                    <span className="font-semibold">
                      {purchase!.user.first} {purchase!.user.last}
                    </span>
                  </span>
                </div>

                {/* Purchase Date */}
                <div className="bg-muted flex items-center gap-2 rounded-full px-4 py-2">
                  <Calendar className="text-primary size-4" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">
                      Purchase Date:
                    </span>{' '}
                    <span className="font-semibold">
                      <DateTime date={purchase!.purchasedAt} dateOnly />
                    </span>
                  </span>
                </div>

                {/* Fiscal Year */}
                {purchaseYear && (
                  <div className="bg-muted flex items-center gap-2 rounded-full px-4 py-2">
                    <Calendar className="text-primary size-4" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Year:</span>{' '}
                      <span className="font-semibold">
                        {purchaseYear.name}
                        {purchase!.yearId === activeYearId && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            (Active)
                          </span>
                        )}
                      </span>
                    </span>
                  </div>
                )}

                {/* Category (optional) */}
                {categoryName && (
                  <div className="bg-muted flex items-center gap-2 rounded-full px-4 py-2">
                    <Tag className="text-primary size-4" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Category:</span>{' '}
                      <span className="font-semibold">{categoryName}</span>
                    </span>
                  </div>
                )}

                {/* Allocation (optional) */}
                {allocationName && (
                  <div className="bg-muted flex items-center gap-2 rounded-full px-4 py-2">
                    <FolderOpen className="text-primary size-4" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Allocation:</span>{' '}
                      <span className="font-semibold">{allocationName}</span>
                    </span>
                  </div>
                )}

                {/* Created */}
                <div className="bg-muted flex items-center gap-2 rounded-full px-4 py-2">
                  <Clock className="text-muted-foreground size-4" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Created:</span>{' '}
                    <span className="font-semibold">
                      <DateTime date={purchase!.createdAt} />
                    </span>
                  </span>
                </div>
              </div>

              {/* Selector Status Indicators */}
              {(purchase!.excludeFromTotal ||
                purchase!.expenseReportCreated ||
                purchase!.reimbursed) && (
                <div className="flex flex-wrap gap-3">
                  {purchase!.excludeFromTotal && (
                    <div className="bg-muted flex items-center gap-2 rounded-full px-4 py-2">
                      <CircleDollarSign className="text-primary size-4" />
                      <span className="text-sm font-semibold">
                        Excluded from Budget
                      </span>
                    </div>
                  )}
                  {purchase!.expenseReportCreated && (
                    <div className="bg-muted flex items-center gap-2 rounded-full px-4 py-2">
                      <FileCheck className="text-primary size-4" />
                      <span className="text-sm font-semibold">
                        Expense Report Created
                      </span>
                    </div>
                  )}
                  {purchase!.reimbursed && (
                    <div className="bg-muted flex items-center gap-2 rounded-full px-4 py-2">
                      <Check className="text-primary size-4" />
                      <span className="text-sm font-semibold">Reimbursed</span>
                    </div>
                  )}
                </div>
              )}

              {/* Receipts */}
              {receiptUrls.length > 0 && (
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Receipt className="text-primary size-4" />
                    <span className="text-muted-foreground text-sm font-medium">
                      Receipts
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {receiptUrls.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-background hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:underline"
                      >
                        <Receipt className="size-4" />
                        File {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {purchase!.notes && (
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <StickyNote className="text-primary size-4" />
                    <span className="text-muted-foreground text-sm font-medium">
                      Notes
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {purchase!.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(true)} className="flex-1">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

// Backward compatibility export for CreatePurchaseDialog
export function CreatePurchaseDialog(props: {
  users: User[];
  categories: CategoryWithDesignation[];
  allocationGroups?: AllocationGroupWithAllocations[];
  miscAllocations?: Allocation[];
  years: YearRecord[];
  activeYearId?: string;
}) {
  return <PurchaseDialog mode="create" {...props} />;
}
