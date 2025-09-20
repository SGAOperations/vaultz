import {
  AllocationGroup,
  Index,
  Account as PrismaAccount,
  Allocation as PrismaAllocation,
  Purchase as PrismaPurchase,
  User,
} from '@/prisma/client';

export type Purchase = Omit<PrismaPurchase, 'amount'> & { amount: number };

export type Account = Omit<PrismaAccount, 'amount'> & { amount: number };

export type AccountWithPurchases = Account & { purchases: PurchaseWithUser[] };

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
