import {
  AllocationGroup,
  CategoryYear,
  Designation,
  Allocation as PrismaAllocation,
  Category as PrismaCategory,
  Purchase as PrismaPurchase,
  Transfer as PrismaTransfer,
  ProcessStep,
  ProcessTemplate,
  User,
  Year,
} from '@/prisma/client';

export type Purchase = Omit<PrismaPurchase, 'amount'> & { amount: number };

export type Category = PrismaCategory;

export type CategoryYearRecord = Omit<CategoryYear, 'amount'> & {
  amount: number;
};

export type CategoryWithDesignation = Category & { designation: Designation };

export type CategoryWithPurchases = CategoryWithDesignation & {
  categoryYears: CategoryYearRecord[];
  purchases: PurchaseWithUser[];
};

export type CategoryWithAvailableAmount = CategoryWithDesignation & {
  available: number;
};

export type CategoryWithAvailableAmountAndYears =
  CategoryWithAvailableAmount & {
    yearIds: string[];
    budget: number;
    spent: number;
  };

export type UserWithPurchases = User & { purchases: Purchase[] };

export type PurchaseWithUser = Purchase & { user: User };

export type DesignationWithPurchases = Designation & {
  purchases: PurchaseWithUser[];
  amount: number;
};

export type Allocation = Omit<PrismaAllocation, 'amount'> & { amount: number };

export type AllocationWithPurchases = Allocation & {
  purchases: PurchaseWithUser[];
};

export type AllocationGroupWithAllocations = AllocationGroup & {
  allocations: AllocationWithPurchases[];
};

export type PurchaseWithUserAndCategory = Purchase & {
  user: User;
  category: Category;
};

export type UserWithPurchasesAndCategory = User & {
  purchases: PurchaseWithUserAndCategory[];
};

export type YearRecord = Year;

export type TransferWithYear = Omit<PrismaTransfer, 'amount'> & {
  amount: number;
  year: Year;
  fromCategory: PrismaCategory;
  toCategory: PrismaCategory;
};

export type ProcessTemplateWithStepCount = ProcessTemplate & { steps: number };

export type ProcessTemplateWithSteps = ProcessTemplate & {
  steps: ProcessStep[];
};

export type PurchaseProcessStep = {
  id: string;
  name: string;
  order: number;
  completion: {
    id: string;
    markedAt: Date;
    completionDate: Date | null;
    notes: string | null;
  } | null;
};

export type PurchaseProcessData = {
  processId: string;
  templateId: string;
  templateName: string;
  steps: PurchaseProcessStep[];
};
