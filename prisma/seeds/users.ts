import { PrismaClient } from '../client';

const firstNames = [
  'Alice',
  'Bob',
  'Carlos',
  'Diana',
  'Ethan',
  'Fiona',
  'George',
  'Hannah',
  'Ivan',
  'Julia',
];

const lastNames = [
  'Adams',
  'Baker',
  'Clark',
  'Davis',
  'Evans',
  'Foster',
  'Garcia',
  'Harris',
  'Ingram',
  'Jones',
];

export async function seedUsers(prisma: PrismaClient, tick: (label: string) => void) {
  const users = await Promise.all(
    firstNames.map((first, i) =>
      prisma.user
        .create({ data: { first, last: lastNames[i] } })
        .then((u) => { tick('Seeding users'); return u; }),
    ),
  );
  return users;
}
