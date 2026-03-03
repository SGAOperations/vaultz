import { PrismaClient, ProcessStep, ProcessTemplate } from '../client';

const templateDefinitions: Array<{
  name: string;
  description: string;
  steps: Array<{ name: string; description: string; order: number }>;
}> = [
  {
    name: 'Reimbursement Process',
    description: 'Standard reimbursement workflow for out-of-pocket purchases',
    steps: [
      {
        name: 'Submit Receipt',
        description: 'Upload receipt documentation',
        order: 1,
      },
      {
        name: 'Manager Approval',
        description: 'Pending manager sign-off',
        order: 2,
      },
      {
        name: 'Finance Review',
        description: 'Finance team reviews the request',
        order: 3,
      },
      {
        name: 'Reimbursement Issued',
        description: 'Payment sent to requester',
        order: 4,
      },
    ],
  },
  {
    name: 'Expense Report',
    description: 'Monthly expense report submission and approval',
    steps: [
      {
        name: 'Compile Receipts',
        description: 'Gather all receipts for the period',
        order: 1,
      },
      {
        name: 'Submit Report',
        description: 'Submit completed expense report',
        order: 2,
      },
      {
        name: 'Accounting Review',
        description: 'Reviewed by accounting department',
        order: 3,
      },
    ],
  },
  {
    name: 'Budget Approval',
    description: 'Approval workflow for large budget expenditures',
    steps: [
      {
        name: 'Draft Request',
        description: 'Prepare expenditure request details',
        order: 1,
      },
      {
        name: 'Department Head Sign-off',
        description: 'Requires department head approval',
        order: 2,
      },
      {
        name: 'Finance Committee Review',
        description: 'Budget committee review and vote',
        order: 3,
      },
      {
        name: 'Final Authorization',
        description: 'Executive authorization',
        order: 4,
      },
      {
        name: 'Funds Released',
        description: 'Approved funds made available',
        order: 5,
      },
    ],
  },
];

export type SeededProcessTemplate = ProcessTemplate & { steps: ProcessStep[] };

export async function seedProcessTemplates(
  prisma: PrismaClient,
): Promise<SeededProcessTemplate[]> {
  const results: SeededProcessTemplate[] = [];

  for (const defn of templateDefinitions) {
    const template = await prisma.processTemplate.create({
      data: { name: defn.name, description: defn.description },
    });
    const steps = await Promise.all(
      defn.steps.map((s) =>
        prisma.processStep.create({
          data: {
            name: s.name,
            description: s.description,
            order: s.order,
            templateId: template.id,
          },
        }),
      ),
    );
    results.push({ ...template, steps });
  }

  const stepCount = results.reduce((sum, t) => sum + t.steps.length, 0);
  console.log(
    `Seeded ${results.length} process templates with ${stepCount} steps.`,
  );
  return results;
}
