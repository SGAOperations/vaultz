import { Category, PrismaClient, Year } from '../client';

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export async function seedCategoryYears(
  prisma: PrismaClient,
  categories: Category[],
  years: Year[],
) {
  const categoryYears = await Promise.all(
    years.flatMap((year) =>
      categories.map((category) =>
        prisma.categoryYear.create({
          data: {
            categoryId: category.id,
            yearId: year.id,
            amount: randomAmount(200, 3000),
          },
        }),
      ),
    ),
  );
  console.log(`Seeded ${categoryYears.length} category-year records.`);
  return categoryYears;
}
