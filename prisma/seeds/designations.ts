import { PrismaClient } from '../client';

function randomCode(): string {
  return String(Math.floor(Math.random() * 9000) + 1000);
}

export async function seedDesignations(prisma: PrismaClient) {
  const designations = await Promise.all([
    prisma.designation.create({ data: { code: randomCode(), name: 'Budget' } }),
    prisma.designation.create({ data: { code: randomCode(), name: 'Cash' } }),
  ]);
  console.log(`Seeded ${designations.length} designations.`);
  return designations;
}
