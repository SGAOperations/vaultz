import { withAccelerate } from '@prisma/extension-accelerate';

import { PrismaClient } from '@/prisma/client/edge';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// In Prisma v7 with Accelerate, pass the Accelerate connection string via accelerateUrl.
// The DATABASE_URL environment variable should contain your Prisma Accelerate URL (prisma://...)
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ accelerateUrl: process.env.DATABASE_URL }).$extends(
    withAccelerate(),
  );

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
