import { Purchase as PrismaPurchase } from '@/prisma/client';

export type Purchase = Omit<PrismaPurchase, 'amount'> & {
  amount: number;
};
