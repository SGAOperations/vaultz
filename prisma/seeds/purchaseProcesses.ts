import { Purchase, PrismaClient, PurchaseProcess } from '../client';
import { SeededProcessTemplate } from './processTemplates';

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateAfter(date: Date): Date {
  const after = new Date(date);
  after.setDate(after.getDate() + Math.floor(Math.random() * 30));
  return after;
}

export async function seedPurchaseProcesses(
  prisma: PrismaClient,
  purchases: Purchase[],
  templates: SeededProcessTemplate[],
): Promise<PurchaseProcess[]> {
  const processes: PurchaseProcess[] = [];

  for (const purchase of purchases) {
    if (Math.random() >= 0.25) continue;

    const template = randomPick(templates);
    const startedAt = new Date(purchase.purchasedAt);

    const process = await prisma.purchaseProcess.create({
      data: { purchaseId: purchase.id, templateId: template.id, startedAt },
    });

    // Earlier steps are more likely to be completed than later ones
    await Promise.all(
      template.steps.map((step) => {
        const completed = Math.random() < Math.max(0.1, 1 - step.order * 0.2);
        const markedAt = randomDateAfter(startedAt);
        return prisma.purchaseStepCompletion.create({
          data: {
            purchaseProcessId: process.id,
            stepId: step.id,
            completed,
            markedAt,
            completionDate: completed ? markedAt : null,
            notes: Math.random() < 0.05 ? 'Reviewed and approved' : null,
          },
        });
      }),
    );

    processes.push(process);
  }

  console.log(`Seeded ${processes.length} purchase processes.`);
  return processes;
}
