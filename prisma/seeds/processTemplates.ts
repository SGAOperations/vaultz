import { PrismaClient, ProcessStep, ProcessTemplate } from '../client';

const templateDefinitions: Array<{
  name: string;
  description: string;
  steps: Array<{ name: string; description: string }>;
}> = [
  {
    name: 'Reimbursement Process',
    description: 'Standard reimbursement workflow for out-of-pocket purchases',
    steps: [
      { name: 'Submit Receipt', description: 'Upload receipt documentation' },
      { name: 'Manager Approval', description: 'Pending manager sign-off' },
      {
        name: 'Finance Review',
        description: 'Finance team reviews the request',
      },
      {
        name: 'Reimbursement Issued',
        description: 'Payment sent to requester',
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
      },
      { name: 'Submit Report', description: 'Submit completed expense report' },
      {
        name: 'Accounting Review',
        description: 'Reviewed by accounting department',
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
      },
      {
        name: 'Department Head Sign-off',
        description: 'Requires department head approval',
      },
      {
        name: 'Finance Committee Review',
        description: 'Budget committee review and vote',
      },
      { name: 'Final Authorization', description: 'Executive authorization' },
      { name: 'Funds Released', description: 'Approved funds made available' },
    ],
  },
  {
    name: 'Vendor Invoice',
    description: 'End-to-end process for paying vendor invoices',
    steps: [
      {
        name: 'Receive Invoice',
        description: 'Log incoming invoice from vendor',
      },
      {
        name: 'Match Purchase Order',
        description: 'Verify invoice matches approved PO',
      },
      {
        name: 'Department Verification',
        description: 'Confirm goods or services were received',
      },
      {
        name: 'Accounts Payable Entry',
        description: 'Record in accounts payable ledger',
      },
      {
        name: 'Payment Scheduled',
        description: 'Payment queued for next payment run',
      },
      { name: 'Payment Sent', description: 'Funds transferred to vendor' },
      {
        name: 'Reconciliation',
        description: 'Confirm payment received and close invoice',
      },
      { name: 'Archive', description: 'File invoice and supporting documents' },
    ],
  },
  {
    name: 'Quick Approval',
    description: 'Lightweight approval for low-value purchases',
    steps: [
      {
        name: 'Supervisor Sign-off',
        description: 'Supervisor approves the purchase',
      },
      {
        name: 'Confirm Receipt',
        description: 'Verify item or service received',
      },
    ],
  },
];

export type SeededProcessTemplate = ProcessTemplate & { steps: ProcessStep[] };

export async function seedProcessTemplates(
  prisma: PrismaClient,
  tick: (label: string) => void,
): Promise<SeededProcessTemplate[]> {
  const results: SeededProcessTemplate[] = [];

  for (const defn of templateDefinitions) {
    const template = await prisma.processTemplate.create({
      data: { name: defn.name, description: defn.description },
    });
    tick('Seeding process templates');

    const steps: ProcessStep[] = [];
    for (const s of defn.steps) {
      const step = await prisma.processStep.create({
        data: {
          name: s.name,
          description: s.description,
          templateId: template.id,
          previousStepId: steps.length > 0 ? steps[steps.length - 1].id : null,
        },
      });
      steps.push(step);
      tick('Seeding process steps');
    }
    results.push({ ...template, steps });
  }

  return results;
}
