import {
  Allocation,
  Category,
  Period,
  PrismaClient,
  User,
  Year,
} from '../client';

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateInYear(year: number): Date {
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}

const DEFAULT_CATEGORY_KEY = 'Miscellaneous';

const purchaseTemplatesByCategory: Record<
  string,
  Array<{
    description: string;
    notes: string;
    minAmount: number;
    maxAmount: number;
  }>
> = {
  'Office Supplies': [
    {
      description: 'Printer paper and pens',
      notes: 'Monthly office supply order',
      minAmount: 20,
      maxAmount: 120,
    },
    {
      description: 'Desk organizers and folders',
      notes: 'For new workspace setup',
      minAmount: 30,
      maxAmount: 100,
    },
    {
      description: 'Sticky notes and markers',
      notes: 'General stationery restock',
      minAmount: 15,
      maxAmount: 60,
    },
    {
      description: 'Binders and dividers',
      notes: 'Filing system upgrade',
      minAmount: 25,
      maxAmount: 80,
    },
  ],
  'Software Licenses': [
    {
      description: 'Zoom Pro subscription',
      notes: 'Annual license for team meetings',
      minAmount: 150,
      maxAmount: 400,
    },
    {
      description: 'Slack workspace upgrade',
      notes: 'Monthly subscription',
      minAmount: 100,
      maxAmount: 300,
    },
    {
      description: 'Adobe Creative Suite',
      notes: 'Annual license for design team',
      minAmount: 400,
      maxAmount: 800,
    },
    {
      description: 'Microsoft 365 Business',
      notes: 'Annual subscription renewal',
      minAmount: 200,
      maxAmount: 500,
    },
  ],
  'Travel Expenses': [
    {
      description: 'Conference travel',
      notes: 'Flight and hotel for conference',
      minAmount: 300,
      maxAmount: 900,
    },
    {
      description: 'Taxi and parking fees',
      notes: 'Transportation to meetings',
      minAmount: 30,
      maxAmount: 150,
    },
    {
      description: 'Hotel accommodation',
      notes: 'Business trip lodging',
      minAmount: 150,
      maxAmount: 500,
    },
    {
      description: 'Car rental',
      notes: 'On-site transportation at conference',
      minAmount: 80,
      maxAmount: 250,
    },
  ],
  'Training Materials': [
    {
      description: 'Online course subscription',
      notes: 'Udemy business account',
      minAmount: 50,
      maxAmount: 200,
    },
    {
      description: 'Training manuals',
      notes: 'Printed materials for workshop',
      minAmount: 80,
      maxAmount: 200,
    },
    {
      description: 'Workshop registration fees',
      notes: 'Professional development',
      minAmount: 100,
      maxAmount: 400,
    },
    {
      description: 'Certification exam vouchers',
      notes: 'Staff certification program',
      minAmount: 150,
      maxAmount: 500,
    },
  ],
  Equipment: [
    {
      description: 'Laptop for new hire',
      notes: 'Dell Latitude 5420',
      minAmount: 700,
      maxAmount: 1500,
    },
    {
      description: 'Monitor and keyboard',
      notes: 'Workstation accessories',
      minAmount: 200,
      maxAmount: 600,
    },
    {
      description: 'Webcam and headset',
      notes: 'Remote work equipment',
      minAmount: 60,
      maxAmount: 200,
    },
    {
      description: 'External hard drive',
      notes: 'Data backup storage',
      minAmount: 50,
      maxAmount: 150,
    },
  ],
  Furniture: [
    {
      description: 'Ergonomic office chair',
      notes: 'Replacement for worn chair',
      minAmount: 200,
      maxAmount: 600,
    },
    {
      description: 'Standing desk',
      notes: 'Health and wellness initiative',
      minAmount: 300,
      maxAmount: 900,
    },
    {
      description: 'Bookshelf unit',
      notes: 'Storage for office materials',
      minAmount: 100,
      maxAmount: 300,
    },
    {
      description: 'Filing cabinet',
      notes: 'Secure document storage',
      minAmount: 80,
      maxAmount: 250,
    },
  ],
  'Meals and Entertainment': [
    {
      description: 'Team lunch',
      notes: 'Monthly team building lunch',
      minAmount: 40,
      maxAmount: 150,
    },
    {
      description: 'Client dinner',
      notes: 'Business meal with potential client',
      minAmount: 60,
      maxAmount: 200,
    },
    {
      description: 'Department celebration',
      notes: 'End-of-quarter celebration',
      minAmount: 80,
      maxAmount: 300,
    },
    {
      description: 'Coffee and snacks for meeting',
      notes: 'Board meeting refreshments',
      minAmount: 20,
      maxAmount: 80,
    },
  ],
  Transportation: [
    {
      description: 'Uber to airport',
      notes: 'Business trip transportation',
      minAmount: 25,
      maxAmount: 80,
    },
    {
      description: 'Parking fees',
      notes: 'Airport parking for business trip',
      minAmount: 20,
      maxAmount: 100,
    },
    {
      description: 'Train tickets',
      notes: 'Intercity business travel',
      minAmount: 40,
      maxAmount: 200,
    },
    {
      description: 'Bus passes',
      notes: 'Local transit for team',
      minAmount: 15,
      maxAmount: 60,
    },
  ],
  Miscellaneous: [
    {
      description: 'Event supplies',
      notes: 'Supplies for community event',
      minAmount: 30,
      maxAmount: 150,
    },
    {
      description: 'Office decorations',
      notes: 'Plants and decorative items',
      minAmount: 20,
      maxAmount: 100,
    },
    {
      description: 'First aid kit restock',
      notes: 'Safety compliance',
      minAmount: 25,
      maxAmount: 80,
    },
    {
      description: 'Postage and shipping',
      notes: 'Mailing materials to partners',
      minAmount: 10,
      maxAmount: 60,
    },
  ],
  'Printing and Postage': [
    {
      description: 'Brochure printing',
      notes: 'Marketing materials for event',
      minAmount: 60,
      maxAmount: 250,
    },
    {
      description: 'Mailing labels and envelopes',
      notes: 'Office correspondence',
      minAmount: 15,
      maxAmount: 50,
    },
    {
      description: 'Poster printing',
      notes: 'Event promotional posters',
      minAmount: 40,
      maxAmount: 150,
    },
    {
      description: 'Bulk mailing campaign',
      notes: 'Outreach to community members',
      minAmount: 80,
      maxAmount: 300,
    },
  ],
};

export async function seedPurchases(
  prisma: PrismaClient,
  categories: Category[],
  allocations: Allocation[],
  users: User[],
  years: Year[],
  periods: Period[],
) {
  const allPurchases = [];
  let receiptCounter = 1;

  for (const year of years) {
    const calYear = year.startDate.getFullYear();

    // Find periods belonging to this year
    const yearPeriodIds = new Set(
      periods.filter((p) => p.yearId === year.id).map((p) => p.id),
    );

    // Find allocations belonging to periods in this year
    const yearAllocations = allocations.filter((a) =>
      yearPeriodIds.has(a.periodId),
    );

    for (const category of categories) {
      const data =
        purchaseTemplatesByCategory[category.name] ??
        purchaseTemplatesByCategory[DEFAULT_CATEGORY_KEY];

      // Find allocations with matching designation in this year's periods
      const matchingAllocations = yearAllocations.filter(
        (a) => a.designationId === category.designationId,
      );

      const purchasesPerCategory = randomInt(8, 12);

      for (let i = 0; i < purchasesPerCategory; i++) {
        const item = randomPick(data);
        const useAllocation =
          Math.random() > 0.25 && matchingAllocations.length > 0;
        const allocation = useAllocation
          ? randomPick(matchingAllocations)
          : null;

        const receiptId = String(receiptCounter).padStart(3, '0');
        receiptCounter++;

        const boolFlags = {
          excludeFromTotal: Math.random() < 0.1,
          expenseReportCreated: Math.random() < 0.3,
          reimbursed: Math.random() < 0.2,
        };

        allPurchases.push(
          await prisma.purchase.create({
            data: {
              amount: randomAmount(item.minAmount, item.maxAmount),
              description: item.description,
              notes: item.notes,
              purchasedAt: randomDateInYear(calYear),
              receipts: [`receipt-${receiptId}.pdf`],
              categoryId: category.id,
              allocationId: allocation?.id ?? null,
              userId: randomPick(users).id,
              yearId: year.id,
              ...boolFlags,
            },
          }),
        );
      }
    }
  }

  console.log(`Seeded ${allPurchases.length} purchases.`);
  return allPurchases;
}
