import { PrismaClient } from './client';

const prisma = new PrismaClient();

async function main() {
  // Check if data already exists, if so abandon seeding
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Database already contains data. Seeding abandoned.');
    return;
  }

  // The migration creates a stub 'Default' year on fresh databases. Reuse it with
  // real seed data, or create fresh if it doesn't exist (e.g. migration was skipped).
  const migrationYear = await prisma.year.findFirst({ where: { name: 'Default' } });
  const defaultYear = migrationYear
    ? await prisma.year.update({
        where: { id: migrationYear.id },
        data: {
          name: 'FY 25',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
        },
      })
    : await prisma.year.create({
        data: {
          name: 'FY 25',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
        },
      });

  const migrationPeriod = await prisma.period.findFirst({
    where: { yearId: defaultYear.id },
  });
  const defaultPeriod = migrationPeriod
    ? await prisma.period.update({
        where: { id: migrationPeriod.id },
        data: {
          name: 'Fall 2025',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2025-12-31'),
        },
      })
    : await prisma.period.create({
        data: {
          name: 'Fall 2025',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2025-12-31'),
          yearId: defaultYear.id,
        },
      });

  // Create Users
  const users = await Promise.all([
    prisma.user.create({ data: { first: 'John', last: 'Doe' } }),
    prisma.user.create({ data: { first: 'Jane', last: 'Smith' } }),
    prisma.user.create({ data: { first: 'Michael', last: 'Johnson' } }),
    prisma.user.create({ data: { first: 'Emily', last: 'Williams' } }),
    prisma.user.create({ data: { first: 'David', last: 'Brown' } }),
  ]);

  // Create Designations
  const designations = await Promise.all([
    prisma.designation.create({ data: { code: 'DN0001', name: 'Budget' } }),
    prisma.designation.create({ data: { code: 'DN0002', name: 'Cash' } }),
  ]);

  // Create Categories
  const categories = await Promise.all([
    // Categories for Budget
    prisma.category.create({
      data: {
        code: 'SC001',
        ledgerCode: '7001',
        name: 'Office Supplies',
        designationId: designations[0].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'SC002',
        ledgerCode: '7002',
        name: 'Software Licenses',
        designationId: designations[0].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'SC003',
        ledgerCode: '7003',
        name: 'Travel Expenses',
        designationId: designations[0].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'SC004',
        ledgerCode: '7004',
        name: 'Training Materials',
        designationId: designations[0].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'SC005',
        ledgerCode: '7005',
        name: 'Equipment',
        designationId: designations[0].id,
      },
    }),
    // Categories for Cash
    prisma.category.create({
      data: {
        code: 'SC006',
        ledgerCode: '7006',
        name: 'Meals and Entertainment',
        designationId: designations[1].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'SC007',
        ledgerCode: '7007',
        name: 'Transportation',
        designationId: designations[1].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'SC008',
        ledgerCode: '7008',
        name: 'Miscellaneous',
        designationId: designations[1].id,
      },
    }),
  ]);

  // Create CategoryYear records
  await Promise.all([
    prisma.categoryYear.create({
      data: {
        categoryId: categories[0].id,
        yearId: defaultYear.id,
        amount: 500.0,
      },
    }),
    prisma.categoryYear.create({
      data: {
        categoryId: categories[1].id,
        yearId: defaultYear.id,
        amount: 1200.0,
      },
    }),
    prisma.categoryYear.create({
      data: {
        categoryId: categories[2].id,
        yearId: defaultYear.id,
        amount: 800.0,
      },
    }),
    prisma.categoryYear.create({
      data: {
        categoryId: categories[3].id,
        yearId: defaultYear.id,
        amount: 600.0,
      },
    }),
    prisma.categoryYear.create({
      data: {
        categoryId: categories[4].id,
        yearId: defaultYear.id,
        amount: 2000.0,
      },
    }),
    prisma.categoryYear.create({
      data: {
        categoryId: categories[5].id,
        yearId: defaultYear.id,
        amount: 400.0,
      },
    }),
    prisma.categoryYear.create({
      data: {
        categoryId: categories[6].id,
        yearId: defaultYear.id,
        amount: 300.0,
      },
    }),
    prisma.categoryYear.create({
      data: {
        categoryId: categories[7].id,
        yearId: defaultYear.id,
        amount: 250.0,
      },
    }),
  ]);

  // Create Allocation Groups
  const allocationGroups = await Promise.all([
    prisma.allocationGroup.create({
      data: { name: 'Tabling Funds', designationId: designations[0].id },
    }),
    prisma.allocationGroup.create({
      data: { name: 'Sustainability', designationId: designations[0].id },
    }),
    prisma.allocationGroup.create({
      data: { name: 'Community Outreach', designationId: designations[1].id },
    }),
  ]);

  // Create Allocations
  const allocations = await Promise.all([
    // Allocations for Budget - Tabling Funds
    prisma.allocation.create({
      data: {
        name: 'Spring Tabling',
        amount: 500.0,
        designationId: designations[0].id,
        allocationGroupId: allocationGroups[0].id,
        periodId: defaultPeriod.id,
      },
    }),
    prisma.allocation.create({
      data: {
        name: 'Fall Tabling',
        amount: 600.0,
        designationId: designations[0].id,
        allocationGroupId: allocationGroups[0].id,
        periodId: defaultPeriod.id,
      },
    }),
    // Allocations for Budget - Sustainability
    prisma.allocation.create({
      data: {
        name: 'Green Initiative',
        amount: 800.0,
        designationId: designations[0].id,
        allocationGroupId: allocationGroups[1].id,
        periodId: defaultPeriod.id,
      },
    }),
    prisma.allocation.create({
      data: {
        name: 'Recycling Program',
        amount: 400.0,
        designationId: designations[0].id,
        allocationGroupId: allocationGroups[1].id,
        periodId: defaultPeriod.id,
      },
    }),
    // Allocations for Cash - Community Outreach
    prisma.allocation.create({
      data: {
        name: 'Food Bank Support',
        amount: 300.0,
        designationId: designations[1].id,
        allocationGroupId: allocationGroups[2].id,
        periodId: defaultPeriod.id,
      },
    }),
    prisma.allocation.create({
      data: {
        name: 'Volunteer Events',
        amount: 250.0,
        designationId: designations[1].id,
        allocationGroupId: allocationGroups[2].id,
        periodId: defaultPeriod.id,
      },
    }),
    // Allocations without groups
    prisma.allocation.create({
      data: {
        name: 'General Operations',
        amount: 1000.0,
        designationId: designations[0].id,
        periodId: defaultPeriod.id,
      },
    }),
    prisma.allocation.create({
      data: {
        name: 'Emergency Fund',
        amount: 500.0,
        designationId: designations[1].id,
        periodId: defaultPeriod.id,
      },
    }),
  ]);

  // Create Purchases
  const now = new Date();
  const getDateDaysAgo = (days: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date;
  };

  await Promise.all([
    // Purchases for Office Supplies
    prisma.purchase.create({
      data: {
        amount: 45.99,
        description: 'Printer paper and pens',
        notes: 'Monthly office supply order',
        purchasedAt: getDateDaysAgo(45),
        receipts: ['receipt-001.pdf'],
        categoryId: categories[0].id,
        allocationId: allocations[0].id,
        userId: users[0].id,
        yearId: defaultYear.id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 78.5,
        description: 'Desk organizers and folders',
        notes: 'For new workspace setup',
        purchasedAt: getDateDaysAgo(42),
        receipts: ['receipt-002.pdf'],
        categoryId: categories[0].id,
        allocationId: allocations[0].id,
        userId: users[1].id,
        yearId: defaultYear.id,
      },
    }),
    // Purchases for Software Licenses
    prisma.purchase.create({
      data: {
        amount: 299.99,
        description: 'Zoom Pro subscription',
        notes: 'Annual license for team meetings',
        purchasedAt: getDateDaysAgo(38),
        receipts: ['receipt-003.pdf'],
        categoryId: categories[1].id,
        allocationId: allocations[1].id,
        userId: users[2].id,
        yearId: defaultYear.id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 199.0,
        description: 'Slack workspace upgrade',
        notes: 'Monthly subscription',
        purchasedAt: getDateDaysAgo(35),
        receipts: ['receipt-004.pdf'],
        categoryId: categories[1].id,
        allocationId: allocations[1].id,
        userId: users[0].id,
        yearId: defaultYear.id,
      },
    }),
    // Purchases for Travel Expenses
    prisma.purchase.create({
      data: {
        amount: 450.0,
        description: 'Conference travel',
        notes: 'Flight and hotel for conference',
        purchasedAt: getDateDaysAgo(30),
        receipts: ['receipt-005.pdf', 'hotel-005.pdf'],
        categoryId: categories[2].id,
        allocationId: allocations[2].id,
        userId: users[3].id,
        expenseReportCreated: true,
        yearId: defaultYear.id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 125.5,
        description: 'Taxi and parking fees',
        notes: 'Transportation to meetings',
        purchasedAt: getDateDaysAgo(28),
        receipts: ['receipt-006.pdf'],
        categoryId: categories[2].id,
        userId: users[1].id,
        reimbursed: true,
        yearId: defaultYear.id,
      },
    }),
    // Purchases for Training Materials
    prisma.purchase.create({
      data: {
        amount: 89.99,
        description: 'Online course subscription',
        notes: 'Udemy business account',
        purchasedAt: getDateDaysAgo(25),
        receipts: ['receipt-007.pdf'],
        categoryId: categories[3].id,
        allocationId: allocations[2].id,
        userId: users[2].id,
        yearId: defaultYear.id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 150.0,
        description: 'Training manuals',
        notes: 'Printed materials for workshop',
        purchasedAt: getDateDaysAgo(22),
        receipts: ['receipt-008.pdf'],
        categoryId: categories[3].id,
        userId: users[4].id,
        yearId: defaultYear.id,
      },
    }),
    // Purchases for Equipment
    prisma.purchase.create({
      data: {
        amount: 899.0,
        description: 'Laptop for new hire',
        notes: 'Dell Latitude 5420',
        purchasedAt: getDateDaysAgo(20),
        receipts: ['receipt-009.pdf', 'warranty-009.pdf'],
        categoryId: categories[4].id,
        allocationId: allocations[3].id,
        userId: users[0].id,
        yearId: defaultYear.id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 349.99,
        description: 'Monitor and keyboard',
        notes: 'Workstation accessories',
        purchasedAt: getDateDaysAgo(18),
        receipts: ['receipt-010.pdf'],
        categoryId: categories[4].id,
        allocationId: allocations[3].id,
        userId: users[2].id,
        yearId: defaultYear.id,
      },
    }),
    // Purchases for Meals and Entertainment
    prisma.purchase.create({
      data: {
        amount: 65.75,
        description: 'Team lunch',
        notes: 'Monthly team building lunch',
        purchasedAt: getDateDaysAgo(15),
        receipts: ['receipt-011.pdf'],
        categoryId: categories[5].id,
        allocationId: allocations[4].id,
        userId: users[3].id,
        yearId: defaultYear.id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 42.5,
        description: 'Client dinner',
        notes: 'Business meal with potential client',
        purchasedAt: getDateDaysAgo(12),
        receipts: ['receipt-012.pdf'],
        categoryId: categories[5].id,
        allocationId: allocations[4].id,
        userId: users[1].id,
        expenseReportCreated: true,
        yearId: defaultYear.id,
      },
    }),
    // Purchases for Transportation
    prisma.purchase.create({
      data: {
        amount: 35.0,
        description: 'Uber to airport',
        notes: 'Business trip transportation',
        purchasedAt: getDateDaysAgo(10),
        receipts: ['receipt-013.pdf'],
        categoryId: categories[6].id,
        allocationId: allocations[5].id,
        userId: users[4].id,
        reimbursed: true,
        yearId: defaultYear.id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 28.0,
        description: 'Parking fees',
        notes: 'Airport parking for business trip',
        purchasedAt: getDateDaysAgo(8),
        receipts: ['receipt-014.pdf'],
        categoryId: categories[6].id,
        userId: users[2].id,
        yearId: defaultYear.id,
      },
    }),
    // Purchases for Miscellaneous
    prisma.purchase.create({
      data: {
        amount: 55.0,
        description: 'Event supplies',
        notes: 'Supplies for community event',
        purchasedAt: getDateDaysAgo(5),
        receipts: ['receipt-015.pdf'],
        categoryId: categories[7].id,
        allocationId: allocations[5].id,
        userId: users[0].id,
        yearId: defaultYear.id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 32.99,
        description: 'Office decorations',
        notes: 'Plants and decorative items',
        purchasedAt: getDateDaysAgo(3),
        receipts: ['receipt-016.pdf'],
        categoryId: categories[7].id,
        userId: users[3].id,
        excludeFromTotal: true,
        yearId: defaultYear.id,
      },
    }),
  ]);

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
