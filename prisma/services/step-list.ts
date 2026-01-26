'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/lib/prisma';
import { StepList, StepListWithTemplates } from '@/lib/types';
import { ResponseType } from '@/lib/utils';

export async function getStepLists(): Promise<StepListWithTemplates[]> {
  const stepLists = await prisma.stepList.findMany({
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  return stepLists;
}

export async function getDefaultStepList(): Promise<StepListWithTemplates | null> {
  const stepList = await prisma.stepList.findFirst({
    where: { isDefault: true },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  return stepList;
}

export async function getStepList(
  id: string,
): Promise<StepListWithTemplates | null> {
  const stepList = await prisma.stepList.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  return stepList;
}

export async function createStepList({
  name,
  isDefault,
  steps,
}: {
  name: string;
  isDefault?: boolean;
  steps?: { name: string; order: number }[];
}): Promise<ResponseType<StepList>> {
  // If setting as default, unset all other defaults first
  if (isDefault) {
    await prisma.stepList.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const stepList = await prisma.stepList.create({
    data: {
      name,
      isDefault: isDefault ?? false,
      steps: steps
        ? {
            create: steps.map((step) => ({
              name: step.name,
              order: step.order,
            })),
          }
        : undefined,
    },
  });

  revalidatePath('/');

  return stepList;
}

export async function updateStepList({
  id,
  name,
  isDefault,
  steps,
}: {
  id: string;
  name?: string;
  isDefault?: boolean;
  steps?: { id?: string; name: string; order: number }[];
}): Promise<ResponseType<StepList>> {
  // If setting as default, unset all other defaults first
  if (isDefault) {
    await prisma.stepList.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  // Handle step updates if provided
  if (steps !== undefined) {
    // Delete steps that are not in the new list
    const stepIds = steps.filter((s) => s.id).map((s) => s.id!);
    await prisma.stepTemplate.deleteMany({
      where: { stepListId: id, id: { notIn: stepIds } },
    });

    // Update or create steps
    for (const step of steps) {
      if (step.id) {
        await prisma.stepTemplate.update({
          where: { id: step.id },
          data: { name: step.name, order: step.order },
        });
      } else {
        await prisma.stepTemplate.create({
          data: { stepListId: id, name: step.name, order: step.order },
        });
      }
    }
  }

  const stepList = await prisma.stepList.update({
    where: { id },
    data: { name: name, isDefault: isDefault },
  });

  revalidatePath('/');

  return stepList;
}

export async function deleteStepList(
  id: string,
): Promise<ResponseType<StepList>> {
  const stepList = await prisma.stepList.delete({ where: { id } });

  revalidatePath('/');

  return stepList;
}
