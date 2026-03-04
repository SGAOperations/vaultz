import { Category, PrismaClient, Year } from '../client';

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export async function seedCategoryYears(
  prisma: PrismaClient,
  categories: Category[],
  years: Year[],
  tick: (label: string) => void,
) {
  const categoryYears = await Promise.all(
    years.flatMap((year) =>
      categories.map((category) =>
        prisma.categoryYear
          .create({
            data: {
              categoryId: category.id,
              yearId: year.id,
              amount: randomAmount(200, 3000),
            },
          })
          .then((cy) => {
            tick('Seeding category budgets');
            return cy;
          }),
      ),
    ),
  );
  return categoryYears;
}
