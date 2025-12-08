import { withAccelerate } from '@prisma/extension-accelerate';

import { PrismaClient } from '@/prisma/client/edge';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// In Prisma v7 with Accelerate, the DATABASE_URL should be your Prisma Accelerate
// connection string (starting with prisma://). This is passed via accelerateUrl.
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ accelerateUrl: process.env.DATABASE_URL }).$extends(
    withAccelerate(),
  );

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
