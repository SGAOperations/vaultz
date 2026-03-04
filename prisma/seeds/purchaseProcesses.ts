import { PrismaClient, Purchase, PurchaseProcess } from '../client';
import { SeededProcessTemplate } from './processTemplates';

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateAfter(date: Date): Date {
  const after = new Date(date);
  after.setDate(after.getDate() + Math.floor(Math.random() * 30));
  return after;
}

// Returns a per-process completion threshold: how far through the steps are done.
// Produces a spread from nearly-empty to fully complete.
function completionThreshold(): number {
  const r = Math.random();
  if (r < 0.2) return 0; // ~20% not started at all
  if (r < 0.4) return 0.25; // ~20% barely started
  if (r < 0.6) return 0.5; // ~20% halfway through
  if (r < 0.8) return 0.75; // ~20% mostly done
  return 1; // ~20% fully complete
}

export async function seedPurchaseProcesses(
  prisma: PrismaClient,
  purchases: Purchase[],
  templates: SeededProcessTemplate[],
): Promise<PurchaseProcess[]> {
  const processes: PurchaseProcess[] = [];

  for (const purchase of purchases) {
    if (Math.random() >= 0.8) continue;

    const template = randomPick(templates);
    const startedAt = new Date(purchase.purchasedAt);
    const threshold = completionThreshold();

    const process = await prisma.purchaseProcess.create({
      data: { purchaseId: purchase.id, templateId: template.id, startedAt },
    });

    // Only create completion records for steps up to the threshold; future steps have no record yet
    const sortedSteps = [...template.steps].sort((a, b) => a.order - b.order);
    const cutoff = Math.floor(threshold * sortedSteps.length);
    const completedSteps = sortedSteps.slice(0, cutoff);
    await Promise.all(
      completedSteps.map((step) => {
        const markedAt = randomDateAfter(startedAt);
        return prisma.purchaseStepCompletion.create({
          data: {
            purchaseProcessId: process.id,
            stepId: step.id,
            completed: true,
            markedAt,
            completionDate: markedAt,
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
