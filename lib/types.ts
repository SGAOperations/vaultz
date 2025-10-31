import {
  Account as PrismaAccount,
  Allocation as PrismaAllocation,
  Purchase as PrismaPurchase,
} from '@/prisma/client';

export type Purchase = Omit<PrismaPurchase, 'amount'> & { amount: number };

export type Account = Omit<PrismaAccount, 'amount'> & { amount: number };

export type AccountWithIndex = Account & { index: Index };

export type AccountWithPurchases = AccountWithIndex & {
  purchases: PurchaseWithUser[];
};

export type UserWithPurchases = User & { purchases: Purchase[] };

export type PurchaseWithUser = Purchase & { user: User };

export type IndexWithPurchases = Index & {
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

// Import types directly from Prisma
export type { AllocationGroup, Index, User } from '@/prisma/client';
