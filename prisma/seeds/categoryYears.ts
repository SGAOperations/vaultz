import { Category, PrismaClient, Year } from '../client';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generates which category codes are active for each fiscal year.
// Each category gets a contiguous active span: it is introduced in a random year
// and discontinued in a later (or same) random year, reflecting realistic changes.
export function generateActiveCategoryCodesByYear(
  categories: Array<{ code: string }>,
  yearNames: string[],
): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {};
  for (const yearName of yearNames) map[yearName] = new Set<string>();

  for (const category of categories) {
    const startYi = randomInt(0, yearNames.length - 1);
    const endYi = randomInt(startYi, yearNames.length - 1);
    for (let yi = startYi; yi <= endYi; yi++)
      map[yearNames[yi]].add(category.code);
  }

  return map;
}

export function categoryYearsCount(
  activeCategoryCodesByYear: Record<string, Set<string>>,
): number {
  return Object.values(activeCategoryCodesByYear).reduce(
    (sum, set) => sum + set.size,
    0,
  );
}

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export async function seedCategoryYears(
  prisma: PrismaClient,
  categories: Category[],
  years: Year[],
  activeCategoryCodesByYear: Record<string, Set<string>>,
  tick: (label: string) => void,
) {
  const categoryYears = await Promise.all(
    years.flatMap((year) =>
      categories
        .filter((category) =>
          activeCategoryCodesByYear[year.name]?.has(category.code),
        )
        .map((category) =>
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
