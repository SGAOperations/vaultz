import { PrismaClient } from './client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data in correct order (respecting foreign key constraints)
  console.log('Clearing existing data...');
  await prisma.purchase.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.allocationGroup.deleteMany();
  await prisma.category.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  console.log('Creating users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        first: 'John',
        last: 'Doe',
      },
    }),
    prisma.user.create({
      data: {
        first: 'Jane',
        last: 'Smith',
      },
    }),
    prisma.user.create({
      data: {
        first: 'Michael',
        last: 'Johnson',
      },
    }),
    prisma.user.create({
      data: {
        first: 'Emily',
        last: 'Williams',
      },
    }),
    prisma.user.create({
      data: {
        first: 'David',
        last: 'Brown',
      },
    }),
  ]);

  // Create Designations
  console.log('Creating designations...');
  const designations = await Promise.all([
    prisma.designation.create({
      data: {
        code: 'PROJ-001',
        name: 'Research and Development',
      },
    }),
    prisma.designation.create({
      data: {
        code: 'PROJ-002',
        name: 'Marketing Campaign',
      },
    }),
    prisma.designation.create({
      data: {
        code: 'PROJ-003',
        name: 'Infrastructure Upgrade',
      },
    }),
    prisma.designation.create({
      data: {
        code: 'PROJ-004',
        name: 'Training and Education',
      },
    }),
  ]);

  // Create Categories
  console.log('Creating categories...');
  const categories = await Promise.all([
    // Categories for Research and Development
    prisma.category.create({
      data: {
        code: 'CAT-001',
        ledgerCode: 'LDGR-5001',
        name: 'Lab Equipment',
        amount: 50000.0,
        designationId: designations[0].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'CAT-002',
        ledgerCode: 'LDGR-5002',
        name: 'Software Licenses',
        amount: 25000.0,
        designationId: designations[0].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'CAT-003',
        ledgerCode: 'LDGR-5003',
        name: 'Research Materials',
        amount: 15000.0,
        designationId: designations[0].id,
      },
    }),
    // Categories for Marketing Campaign
    prisma.category.create({
      data: {
        code: 'CAT-004',
        ledgerCode: 'LDGR-6001',
        name: 'Digital Advertising',
        amount: 30000.0,
        designationId: designations[1].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'CAT-005',
        ledgerCode: 'LDGR-6002',
        name: 'Print Materials',
        amount: 10000.0,
        designationId: designations[1].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'CAT-006',
        ledgerCode: 'LDGR-6003',
        name: 'Event Sponsorship',
        amount: 20000.0,
        designationId: designations[1].id,
      },
    }),
    // Categories for Infrastructure Upgrade
    prisma.category.create({
      data: {
        code: 'CAT-007',
        ledgerCode: 'LDGR-7001',
        name: 'Server Hardware',
        amount: 75000.0,
        designationId: designations[2].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'CAT-008',
        ledgerCode: 'LDGR-7002',
        name: 'Network Equipment',
        amount: 35000.0,
        designationId: designations[2].id,
      },
    }),
    // Categories for Training and Education
    prisma.category.create({
      data: {
        code: 'CAT-009',
        ledgerCode: 'LDGR-8001',
        name: 'Course Fees',
        amount: 12000.0,
        designationId: designations[3].id,
      },
    }),
    prisma.category.create({
      data: {
        code: 'CAT-010',
        ledgerCode: 'LDGR-8002',
        name: 'Conference Attendance',
        amount: 18000.0,
        designationId: designations[3].id,
      },
    }),
  ]);

  // Create Allocation Groups
  console.log('Creating allocation groups...');
  const allocationGroups = await Promise.all([
    prisma.allocationGroup.create({
      data: {
        name: 'Q1 Budget',
        designationId: designations[0].id,
      },
    }),
    prisma.allocationGroup.create({
      data: {
        name: 'Q2 Budget',
        designationId: designations[0].id,
      },
    }),
    prisma.allocationGroup.create({
      data: {
        name: 'Marketing Phase 1',
        designationId: designations[1].id,
      },
    }),
    prisma.allocationGroup.create({
      data: {
        name: 'Infrastructure Phase 1',
        designationId: designations[2].id,
      },
    }),
  ]);

  // Create Allocations
  console.log('Creating allocations...');
  const allocations = await Promise.all([
    // Allocations for Research and Development - Q1
    prisma.allocation.create({
      data: {
        name: 'January Research',
        amount: 15000.0,
        designationId: designations[0].id,
        allocationGroupId: allocationGroups[0].id,
      },
    }),
    prisma.allocation.create({
      data: {
        name: 'February Research',
        amount: 18000.0,
        designationId: designations[0].id,
        allocationGroupId: allocationGroups[0].id,
      },
    }),
    prisma.allocation.create({
      data: {
        name: 'March Research',
        amount: 17000.0,
        designationId: designations[0].id,
        allocationGroupId: allocationGroups[0].id,
      },
    }),
    // Allocations for Research and Development - Q2
    prisma.allocation.create({
      data: {
        name: 'April Research',
        amount: 20000.0,
        designationId: designations[0].id,
        allocationGroupId: allocationGroups[1].id,
      },
    }),
    prisma.allocation.create({
      data: {
        name: 'May Research',
        amount: 22000.0,
        designationId: designations[0].id,
        allocationGroupId: allocationGroups[1].id,
      },
    }),
    // Allocations for Marketing Campaign
    prisma.allocation.create({
      data: {
        name: 'Social Media Campaign',
        amount: 12000.0,
        designationId: designations[1].id,
        allocationGroupId: allocationGroups[2].id,
      },
    }),
    prisma.allocation.create({
      data: {
        name: 'Google Ads',
        amount: 15000.0,
        designationId: designations[1].id,
        allocationGroupId: allocationGroups[2].id,
      },
    }),
    // Allocations for Infrastructure (with and without groups)
    prisma.allocation.create({
      data: {
        name: 'Server Purchase',
        amount: 50000.0,
        designationId: designations[2].id,
        allocationGroupId: allocationGroups[3].id,
      },
    }),
    prisma.allocation.create({
      data: {
        name: 'Network Upgrade',
        amount: 25000.0,
        designationId: designations[2].id,
        allocationGroupId: allocationGroups[3].id,
      },
    }),
    // Allocations without groups
    prisma.allocation.create({
      data: {
        name: 'Emergency Fund',
        amount: 10000.0,
        designationId: designations[3].id,
      },
    }),
  ]);

  // Create Purchases
  console.log('Creating purchases...');
  const now = new Date();
  const getDateDaysAgo = (days: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date;
  };

  await Promise.all([
    // Purchases for Lab Equipment
    prisma.purchase.create({
      data: {
        amount: 5499.99,
        description: 'High-precision microscope',
        notes: 'Model XYZ-500, for cell research',
        purchasedAt: getDateDaysAgo(45),
        receipts: ['receipt-001.pdf'],
        categoryId: categories[0].id,
        allocationId: allocations[0].id,
        userId: users[0].id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 1299.0,
        description: 'Centrifuge machine',
        notes: 'Benchtop centrifuge, 6 tube capacity',
        purchasedAt: getDateDaysAgo(42),
        receipts: ['receipt-002.pdf'],
        categoryId: categories[0].id,
        allocationId: allocations[0].id,
        userId: users[1].id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 3750.5,
        description: 'Laboratory freezer',
        notes: 'Ultra-low temperature freezer, -80C',
        purchasedAt: getDateDaysAgo(38),
        receipts: ['receipt-003.pdf', 'warranty-003.pdf'],
        categoryId: categories[0].id,
        allocationId: allocations[1].id,
        userId: users[2].id,
      },
    }),
    // Purchases for Software Licenses
    prisma.purchase.create({
      data: {
        amount: 2499.99,
        description: 'MATLAB license (annual)',
        notes: 'For data analysis team',
        purchasedAt: getDateDaysAgo(35),
        receipts: ['receipt-004.pdf'],
        categoryId: categories[1].id,
        allocationId: allocations[1].id,
        userId: users[0].id,
        excludeFromTotal: false,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 1899.0,
        description: 'Adobe Creative Cloud (5 seats)',
        notes: 'For design and documentation',
        purchasedAt: getDateDaysAgo(30),
        receipts: ['receipt-005.pdf'],
        categoryId: categories[1].id,
        allocationId: allocations[2].id,
        userId: users[3].id,
      },
    }),
    // Purchases for Research Materials
    prisma.purchase.create({
      data: {
        amount: 875.25,
        description: 'Chemical reagents (bulk order)',
        notes: 'Standard lab chemicals for Q1 experiments',
        purchasedAt: getDateDaysAgo(28),
        receipts: ['receipt-006.pdf'],
        categoryId: categories[2].id,
        allocationId: allocations[2].id,
        userId: users[1].id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 425.0,
        description: 'Lab consumables',
        notes: 'Pipette tips, gloves, petri dishes',
        purchasedAt: getDateDaysAgo(25),
        receipts: ['receipt-007.pdf'],
        categoryId: categories[2].id,
        userId: users[2].id,
      },
    }),
    // Purchases for Digital Advertising
    prisma.purchase.create({
      data: {
        amount: 4500.0,
        description: 'Facebook Ads campaign',
        notes: 'Two-week campaign targeting 25-45 age group',
        purchasedAt: getDateDaysAgo(20),
        receipts: ['receipt-008.pdf', 'campaign-report-008.pdf'],
        categoryId: categories[3].id,
        allocationId: allocations[5].id,
        userId: users[3].id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 6250.0,
        description: 'Google Ads Q1 budget',
        notes: 'Search and display network campaigns',
        purchasedAt: getDateDaysAgo(18),
        receipts: ['receipt-009.pdf'],
        categoryId: categories[3].id,
        allocationId: allocations[6].id,
        userId: users[4].id,
      },
    }),
    // Purchases for Print Materials
    prisma.purchase.create({
      data: {
        amount: 1250.0,
        description: 'Brochures and flyers',
        notes: '5,000 brochures and 10,000 flyers',
        purchasedAt: getDateDaysAgo(15),
        receipts: ['receipt-010.pdf'],
        categoryId: categories[4].id,
        userId: users[3].id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 780.5,
        description: 'Business cards',
        notes: 'Premium cards for sales team (500 per person)',
        purchasedAt: getDateDaysAgo(12),
        receipts: ['receipt-011.pdf'],
        categoryId: categories[4].id,
        userId: users[4].id,
      },
    }),
    // Purchases for Event Sponsorship
    prisma.purchase.create({
      data: {
        amount: 5000.0,
        description: 'Tech conference sponsorship',
        notes: 'Bronze sponsor package, includes booth',
        purchasedAt: getDateDaysAgo(10),
        receipts: ['receipt-012.pdf', 'contract-012.pdf'],
        categoryId: categories[5].id,
        allocationId: allocations[5].id,
        userId: users[0].id,
      },
    }),
    // Purchases for Server Hardware
    prisma.purchase.create({
      data: {
        amount: 12500.0,
        description: 'Dell PowerEdge server',
        notes: 'R750, 64GB RAM, dual Xeon processors',
        purchasedAt: getDateDaysAgo(8),
        receipts: ['receipt-013.pdf', 'warranty-013.pdf'],
        categoryId: categories[6].id,
        allocationId: allocations[7].id,
        userId: users[2].id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 8750.99,
        description: 'NAS storage system',
        notes: 'Synology RS3621xs+, 48TB capacity',
        purchasedAt: getDateDaysAgo(6),
        receipts: ['receipt-014.pdf'],
        categoryId: categories[6].id,
        allocationId: allocations[7].id,
        userId: users[2].id,
      },
    }),
    // Purchases for Network Equipment
    prisma.purchase.create({
      data: {
        amount: 3250.0,
        description: 'Cisco switches (2x)',
        notes: 'Catalyst 9200 series, 48 port',
        purchasedAt: getDateDaysAgo(5),
        receipts: ['receipt-015.pdf'],
        categoryId: categories[7].id,
        allocationId: allocations[8].id,
        userId: users[1].id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 1899.0,
        description: 'Enterprise WiFi access points',
        notes: 'UniFi AP, 5 units for office coverage',
        purchasedAt: getDateDaysAgo(4),
        receipts: ['receipt-016.pdf'],
        categoryId: categories[7].id,
        allocationId: allocations[8].id,
        userId: users[1].id,
      },
    }),
    // Purchases for Course Fees
    prisma.purchase.create({
      data: {
        amount: 1499.0,
        description: 'AWS certification training',
        notes: 'Solutions Architect course for 3 employees',
        purchasedAt: getDateDaysAgo(3),
        receipts: ['receipt-017.pdf'],
        categoryId: categories[8].id,
        allocationId: allocations[9].id,
        userId: users[4].id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 899.0,
        description: 'Agile project management course',
        notes: 'Online certification program',
        purchasedAt: getDateDaysAgo(2),
        receipts: ['receipt-018.pdf'],
        categoryId: categories[8].id,
        userId: users[0].id,
      },
    }),
    // Purchases for Conference Attendance
    prisma.purchase.create({
      data: {
        amount: 2500.0,
        description: 'AWS re:Invent conference tickets',
        notes: '2 tickets for engineering team',
        purchasedAt: getDateDaysAgo(1),
        receipts: ['receipt-019.pdf'],
        categoryId: categories[9].id,
        userId: users[2].id,
        expenseReportCreated: true,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 1850.0,
        description: 'Conference travel and accommodation',
        notes: 'Hotel and flights for AWS re:Invent',
        purchasedAt: getDateDaysAgo(1),
        receipts: ['receipt-020.pdf', 'hotel-020.pdf', 'flight-020.pdf'],
        categoryId: categories[9].id,
        userId: users[2].id,
        expenseReportCreated: true,
        reimbursed: true,
      },
    }),
    // Additional purchases with various states
    prisma.purchase.create({
      data: {
        amount: 325.5,
        description: 'Office supplies for lab',
        notes: 'Notebooks, pens, sticky notes',
        purchasedAt: getDateDaysAgo(7),
        receipts: ['receipt-021.pdf'],
        categoryId: categories[2].id,
        userId: users[1].id,
        excludeFromTotal: true,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 599.99,
        description: 'Project management software',
        notes: 'Jira annual subscription',
        purchasedAt: getDateDaysAgo(14),
        receipts: ['receipt-022.pdf'],
        categoryId: categories[1].id,
        allocationId: allocations[3].id,
        userId: users[0].id,
      },
    }),
    prisma.purchase.create({
      data: {
        amount: 2100.0,
        description: 'Trade show booth materials',
        notes: 'Banner stands, display materials, promotional items',
        purchasedAt: getDateDaysAgo(22),
        receipts: ['receipt-023.pdf'],
        categoryId: categories[4].id,
        allocationId: allocations[6].id,
        userId: users[4].id,
        expenseReportCreated: true,
      },
    }),
  ]);

  console.log('✅ Database seeding completed successfully!');
  console.log(`Created ${users.length} users`);
  console.log(`Created ${designations.length} designations`);
  console.log(`Created ${categories.length} categories`);
  console.log(`Created ${allocationGroups.length} allocation groups`);
  console.log(`Created ${allocations.length} allocations`);
  console.log('Created 23 purchases');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
