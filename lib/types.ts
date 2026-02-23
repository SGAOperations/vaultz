import {
  AllocationGroup,
  Designation,
  Allocation as PrismaAllocation,
  Category as PrismaCategory,
  Purchase as PrismaPurchase,
  User,
} from '@/prisma/client';

export type Purchase = Omit<PrismaPurchase, 'amount'> & { amount: number };

export type Category = Omit<PrismaCategory, 'amount'> & { amount: number };

export type CategoryWithDesignation = Category & { designation: Designation };

export type CategoryWithPurchases = CategoryWithDesignation & {
  purchases: PurchaseWithUser[];
};

export type CategoryWithAvailableAmount = CategoryWithDesignation & {
  available: number;
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
