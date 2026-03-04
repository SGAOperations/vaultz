import { Category, PrismaClient, Year } from '../client';

// Defines which category codes are active for each fiscal year.
// Categories absent from a year's set did not exist in that fiscal year.
const activeCategoryCodesByYear: Record<string, Set<string>> = {
  'FY 23': new Set([
    '001', // Office Supplies
    '002', // Software Licenses
    '003', // Travel Expenses
    '005', // Equipment
    '007', // Meals and Entertainment
    '008', // Transportation
    '009', // Miscellaneous
    '010', // Printing and Postage
  ]),
  'FY 24': new Set([
    '001', // Office Supplies
    '002', // Software Licenses
    '003', // Travel Expenses
    '004', // Training Materials (added FY 24)
    '005', // Equipment
    '007', // Meals and Entertainment
    '008', // Transportation
    '009', // Miscellaneous
    '010', // Printing and Postage
  ]),
  'FY 25': new Set([
    '001', // Office Supplies
    '002', // Software Licenses
    '004', // Training Materials
    '005', // Equipment
    '006', // Furniture (added FY 25)
    '007', // Meals and Entertainment
    '008', // Transportation
    '009', // Miscellaneous
    // Travel Expenses (003) discontinued after FY 24
    // Printing and Postage (010) discontinued after FY 24
  ]),
};

export function isCategoryActiveInYear(
  categoryCode: string,
  yearName: string,
): boolean {
  return activeCategoryCodesByYear[yearName]?.has(categoryCode) ?? false;
}

export const CATEGORY_YEARS_COUNT = Object.values(
  activeCategoryCodesByYear,
).reduce((sum, set) => sum + set.size, 0);

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
      categories
        .filter((category) => isCategoryActiveInYear(category.code, year.name))
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
