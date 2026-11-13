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
  PurchaseRequestEventType,
  PurchaseRequestStatus,
  User,
  Year,
} from '@/prisma/client';

import type { RequestAction } from '@/lib/permissions';
import type { AllocationBudget } from '@/lib/purchase-request';

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

export type PurchaseWithUser = Purchase & {
  user: User;
  process: { templateId: string } | null;
};

export type DesignationWithPurchases = Designation & {
  purchases: PurchaseWithUser[];
  amount: number;
};

export type Allocation = Omit<PrismaAllocation, 'amount'> & { amount: number };

export type AllocationWithPurchases = Allocation & {
  purchases: PurchaseWithUser[];
};

export type AllocationWithStats = AllocationWithPurchases & {
  spent: number;
  remaining: number;
};

export type AllocationGroupWithAllocations = AllocationGroup & {
  allocations: AllocationWithPurchases[];
};

export type AllocationGroupWithStats = AllocationGroup & {
  designation: Designation;
  allocations: AllocationWithStats[];
  totalAmount: number;
  totalSpent: number;
  // Open purchase requests against the group's allocations.
  totalCommitted: number;
  openRequestCount: number;
};

export type PurchaseWithUserAndCategory = Purchase & {
  user: User;
  category: Category;
  process: { templateId: string } | null;
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

export type DivisionFigures = {
  allocationGroupId: string;
  name: string;
  designationId: string;
  designationCode: string;
  designationName: string;
  allocatedTotal: number;
  spentTotal: number;
  remaining: number;
  notReimbursedCount: number;
  noExpenseReportCount: number;
};

export type PersonName = { id: string; first: string; last: string };

export type PurchaseRequestSummary = {
  id: string;
  amount: number;
  description: string;
  status: PurchaseRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  escalationNotifyError: string | null;
  requester: PersonName;
  purchaser: PersonName;
  category: { id: string; name: string; code: string };
  allocation: {
    id: string;
    name: string;
    allocationGroup: { id: string; name: string } | null;
  };
  purchasingMethod: { id: string; name: string } | null;
};

export type PurchaseRequestEventRecord = {
  id: string;
  type: PurchaseRequestEventType;
  note: string | null;
  createdAt: Date;
  actor: PersonName | null;
};

export type PurchaseRequestDetail = PurchaseRequestSummary & {
  notes: string | null;
  attachments: string[];
  decidedAt: Date | null;
  decisionNote: string | null;
  decidedBy: PersonName | null;
  escalatedAt: Date | null;
  escalationNotifiedAt: Date | null;
  purchaseId: string | null;
  events: PurchaseRequestEventRecord[];
  allowedActions: RequestAction[];
  budget: AllocationBudget;
};

export type RequestFormDivision = {
  id: string;
  name: string;
  designationId: string;
  designationLabel: string;
  allocations: { id: string; name: string; periodName: string }[];
  categories: { id: string; name: string; code: string }[];
};

export type RequestFormOptions = {
  year: { id: string; name: string } | null;
  divisions: RequestFormDivision[];
  purchasers: PersonName[];
  purchasingMethods: { id: string; name: string; description: string | null }[];
};
