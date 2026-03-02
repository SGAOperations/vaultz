import { PrismaClient } from '../client';

export async function seedDesignations(prisma: PrismaClient) {
  const designations = await Promise.all([
    prisma.designation.create({ data: { code: '0001', name: 'Budget' } }),
    prisma.designation.create({ data: { code: '0002', name: 'Cash' } }),
  ]);
  console.log(`Seeded ${designations.length} designations.`);
  return designations;
}
