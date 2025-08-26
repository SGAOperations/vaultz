import {
  Index,
  Account as PrismaAccount,
  Purchase as PrismaPurchase,
  User,
} from '@/prisma/client';

export type Purchase = Omit<PrismaPurchase, 'amount'> & { amount: number };

export type Account = Omit<PrismaAccount, 'amount'> & { amount: number };

export type PurchaseWithUser = Purchase & { user: User };

export type IndexWithPurchases = Index & {
  purchases: PurchaseWithUser[];
  amount: number;
};
