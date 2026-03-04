import { PrismaClient } from '../client';

function randomCode(): string {
  return String(Math.floor(Math.random() * 9000) + 1000);
}

export async function seedDesignations(
  prisma: PrismaClient,
  tick: (label: string) => void,
) {
  const designations = await Promise.all([
    prisma.designation
      .create({ data: { code: randomCode(), name: 'Budget' } })
      .then((d) => {
        tick('Seeding designations');
        return d;
      }),
    prisma.designation
      .create({ data: { code: randomCode(), name: 'Cash' } })
      .then((d) => {
        tick('Seeding designations');
        return d;
      }),
  ]);
  return designations;
}
