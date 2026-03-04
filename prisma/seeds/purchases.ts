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

function randomDateInRange(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
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
  'Research and Development': [
    {
      description: 'Prototype materials',
      notes: 'Components for R&D prototype build',
      minAmount: 200,
      maxAmount: 800,
    },
    {
      description: 'Research software subscription',
      notes: 'Annual license for data analysis tools',
      minAmount: 300,
      maxAmount: 900,
    },
    {
      description: 'Lab supplies',
      notes: 'Consumables for testing lab',
      minAmount: 100,
      maxAmount: 400,
    },
    {
      description: 'Academic journal access',
      notes: 'Annual journal subscription',
      minAmount: 150,
      maxAmount: 500,
    },
  ],
  'Marketing Materials': [
    {
      description: 'Branded merchandise',
      notes: 'Logo pens and notebooks for events',
      minAmount: 100,
      maxAmount: 400,
    },
    {
      description: 'Social media ad spend',
      notes: 'Paid promotion for campaign',
      minAmount: 200,
      maxAmount: 600,
    },
    {
      description: 'Banner and signage',
      notes: 'Printed banners for trade show',
      minAmount: 150,
      maxAmount: 500,
    },
    {
      description: 'Photography session',
      notes: 'Product photos for catalog',
      minAmount: 200,
      maxAmount: 700,
    },
  ],
  Utilities: [
    {
      description: 'Electricity bill',
      notes: 'Monthly office electricity',
      minAmount: 150,
      maxAmount: 500,
    },
    {
      description: 'Internet service',
      notes: 'Monthly broadband invoice',
      minAmount: 80,
      maxAmount: 200,
    },
    {
      description: 'Water and sewage',
      notes: 'Quarterly utility bill',
      minAmount: 40,
      maxAmount: 120,
    },
    {
      description: 'Natural gas',
      notes: 'Monthly heating bill',
      minAmount: 60,
      maxAmount: 180,
    },
  ],
  'Maintenance and Repairs': [
    {
      description: 'HVAC service',
      notes: 'Annual HVAC maintenance contract',
      minAmount: 200,
      maxAmount: 600,
    },
    {
      description: 'Plumbing repair',
      notes: 'Emergency plumbing fix',
      minAmount: 100,
      maxAmount: 400,
    },
    {
      description: 'Elevator inspection',
      notes: 'Annual safety inspection',
      minAmount: 150,
      maxAmount: 450,
    },
    {
      description: 'Office equipment repair',
      notes: 'Printer and copier maintenance',
      minAmount: 80,
      maxAmount: 300,
    },
  ],
  'Petty Cash': [
    {
      description: 'Office refreshments',
      notes: 'Coffee and beverages for staff',
      minAmount: 15,
      maxAmount: 60,
    },
    {
      description: 'Parking meter fees',
      notes: 'Short-term parking for errands',
      minAmount: 5,
      maxAmount: 30,
    },
    {
      description: 'Small office supplies',
      notes: 'Pens, tape, and batteries',
      minAmount: 10,
      maxAmount: 40,
    },
    {
      description: 'Courier tip',
      notes: 'Tip for delivery service',
      minAmount: 5,
      maxAmount: 20,
    },
  ],
  'Event Supplies': [
    {
      description: 'Tablecloths and decorations',
      notes: 'Setup materials for event',
      minAmount: 40,
      maxAmount: 150,
    },
    {
      description: 'Name badge holders',
      notes: 'Lanyards for conference attendees',
      minAmount: 20,
      maxAmount: 80,
    },
    {
      description: 'Catering supplies',
      notes: 'Plates, cups, and napkins',
      minAmount: 30,
      maxAmount: 120,
    },
    {
      description: 'Audio-visual rental',
      notes: 'Projector and screen rental',
      minAmount: 100,
      maxAmount: 400,
    },
  ],
  'Gift Cards': [
    {
      description: 'Employee recognition gift cards',
      notes: 'Q3 performance recognition awards',
      minAmount: 25,
      maxAmount: 100,
    },
    {
      description: 'Client appreciation gift cards',
      notes: 'Thank-you gifts for key clients',
      minAmount: 50,
      maxAmount: 150,
    },
    {
      description: 'Raffle prize gift cards',
      notes: 'Prizes for staff event raffle',
      minAmount: 25,
      maxAmount: 100,
    },
    {
      description: 'Volunteer thank-you gift cards',
      notes: 'Appreciation for event volunteers',
      minAmount: 20,
      maxAmount: 75,
    },
  ],
};

// Pre-generate how many purchases to create per (year × category) pair.
// Pairs are ordered: for each year index yi, for each category index ci → index = yi * catCount + ci.
// Returns 0 for pairs where the category did not exist in that fiscal year so that
// seedPurchases can use the same yi * categories.length + ci index without modification.
export function generatePurchaseCounts(
  categories: Array<{ code: string }>,
  yearNames: string[],
  activeCategoryCodesByYear: Record<string, Set<string>>,
): number[] {
  return yearNames.flatMap((yearName) =>
    categories.map((cat) =>
      activeCategoryCodesByYear[yearName]?.has(cat.code) ? randomInt(8, 12) : 0,
    ),
  );
}

export async function seedPurchases(
  prisma: PrismaClient,
  categories: Category[],
  allocations: Allocation[],
  users: User[],
  years: Year[],
  periods: Period[],
  counts: number[],
  tick: (label: string) => void,
) {
  const allPurchases = [];
  let receiptCounter = 1;

  for (let yi = 0; yi < years.length; yi++) {
    const year = years[yi];
    // Find periods belonging to this year
    const yearPeriodIds = new Set(
      periods.filter((p) => p.yearId === year.id).map((p) => p.id),
    );

    // Find allocations belonging to periods in this year
    const yearAllocations = allocations.filter((a) =>
      yearPeriodIds.has(a.periodId),
    );

    for (let ci = 0; ci < categories.length; ci++) {
      const category = categories[ci];
      const data =
        purchaseTemplatesByCategory[category.name] ??
        purchaseTemplatesByCategory[DEFAULT_CATEGORY_KEY];

      // Find allocations with matching designation in this year's periods
      const matchingAllocations = yearAllocations.filter(
        (a) => a.designationId === category.designationId,
      );

      const purchasesPerCategory = counts[yi * categories.length + ci];

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
          excludeFromTotal: Math.random() < 0.05,
          expenseReportCreated: Math.random() < 0.05,
          reimbursed: Math.random() < 0.05,
        };

        allPurchases.push(
          await prisma.purchase.create({
            data: {
              amount: randomAmount(item.minAmount, item.maxAmount),
              description: item.description,
              notes: item.notes,
              purchasedAt: randomDateInRange(year.startDate, year.endDate),
              receipts: [`receipt-${receiptId}.pdf`],
              categoryId: category.id,
              allocationId: allocation?.id ?? null,
              userId: randomPick(users).id,
              yearId: year.id,
              ...boolFlags,
            },
          }),
        );
        tick('Seeding purchases');
      }
    }
  }

  return allPurchases;
}
