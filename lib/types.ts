import { Index, Purchase as PrismaPurchase, Account as PrismaAccount, User } from '@/prisma/client';

export type Purchase = Omit<PrismaPurchase, 'amount'> & { amount: number };

export type Account = Omit<PrismaAccount, 'amount'> & { amount: number };

export type PurchaseWithUser = Purchase & { user: User };

export type IndexWithPurchases = Index & { purchases: PurchaseWithUser[]; amount: number };
