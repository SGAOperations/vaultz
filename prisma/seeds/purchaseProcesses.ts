import { PrismaClient, Purchase, PurchaseProcess } from '../client';
import { SeededProcessTemplate } from './processTemplates';

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

export interface ProcessPlan {
  purchaseIndex: number;
  templateIndex: number;
  stepCutoff: number;
}

// Pre-generate which purchases get a process, which template they use,
// and how many steps complete — without any DB calls.
// templateStepCounts must be ordered identically to the seeded templates.
export function generateProcessPlans(
  purchasesCount: number,
  templateStepCounts: number[],
): ProcessPlan[] {
  const plans: ProcessPlan[] = [];
  for (let i = 0; i < purchasesCount; i++) {
    if (Math.random() >= 0.8) continue;
    const templateIndex = Math.floor(Math.random() * templateStepCounts.length);
    const threshold = completionThreshold();
    const stepCutoff = Math.floor(
      threshold * templateStepCounts[templateIndex],
    );
    plans.push({ purchaseIndex: i, templateIndex, stepCutoff });
  }
  return plans;
}

export async function seedPurchaseProcesses(
  prisma: PrismaClient,
  purchases: Purchase[],
  templates: SeededProcessTemplate[],
  plans: ProcessPlan[],
  tick: (label: string) => void,
): Promise<PurchaseProcess[]> {
  const processes: PurchaseProcess[] = [];

  for (const plan of plans) {
    const purchase = purchases[plan.purchaseIndex];
    const template = templates[plan.templateIndex];
    const startedAt = new Date(purchase.purchasedAt);

    const process = await prisma.purchaseProcess.create({
      data: { purchaseId: purchase.id, templateId: template.id, startedAt },
    });
    tick('Seeding purchase processes');

    const sortedSteps = [...template.steps].sort((a, b) => a.order - b.order);
    const completedSteps = sortedSteps.slice(0, plan.stepCutoff);
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
    for (let i = 0; i < plan.stepCutoff; i++)
      tick('Seeding process completions');

    processes.push(process);
  }

  return processes;
}
