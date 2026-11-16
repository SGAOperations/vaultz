import { z } from 'zod';

export const addDivisionAccessSchema = z.object({
  allocationGroupId: z.uuid('Pick a division.'),
  positionKey: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Use the SGAuth position key, e.g. vice-president-of-campus-affairs.',
    ),
});

export const removeDivisionAccessSchema = z.object({
  id: z.uuid('Invalid assignment.'),
});

export type AddDivisionAccessInput = z.input<typeof addDivisionAccessSchema>;
export type RemoveDivisionAccessInput = z.input<
  typeof removeDivisionAccessSchema
>;
