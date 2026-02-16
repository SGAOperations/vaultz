import { withAccelerate } from '@prisma/extension-accelerate';

import { PrismaClient } from '@/prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  const client = new PrismaClient();

  // Only use Accelerate in production
  if (process.env.NODE_ENV === 'production')
    return client.$extends(withAccelerate());

  return client;
};

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
