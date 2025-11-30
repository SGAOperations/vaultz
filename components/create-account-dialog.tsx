'use client';

import { z } from 'zod/v4';

import { createAccount } from '@/prisma/services/account';

import { handleError, isError } from '@/lib/utils';

import { FormDialog } from '@/components/ui/form-dialog';
import { FormInput } from '@/components/ui/form-input';

const schema = z.object({
  indexId: z.string().min(1, 'Please select an index'),
  code: z.string().length(4, 'Must be exactly 4 characters long'),
  name: z.string().min(1, 'Please enter an account name'),
  amount: z.coerce
    .number<number>()
    .min(0.01, 'Must be at least $0.01')
    .multipleOf(0.01, 'Must contain at most 2 decimal places'),
});

type FormData = z.infer<typeof schema>;

export function CreateAccountDialog({
  indexId,
  trigger,
}: {
  indexId: string;
  trigger: React.ReactNode;
}) {
  async function onSubmit(data: FormData): Promise<boolean> {
    const result = await handleError(createAccount(data), {
      toast: {
        loading: 'Creating account...',
        success: 'Account created successfully',
        error: 'Failed to create account',
      },
    });
    return !isError(result);
  }

  return (
    <FormDialog
      trigger={trigger}
      title="Create Account"
      description="Each account has a set budget."
      schema={schema}
      defaultValues={{ indexId, code: '', name: '', amount: 0 }}
      onSubmit={onSubmit}
    >
      <FormInput<FormData> name="name" label="Name" placeholder="Food" />
      <FormInput<FormData>
        name="code"
        label="Code"
        placeholder="7XXX"
        description="The spend category number to be associated with this account."
      />
      <FormInput<FormData>
        name="amount"
        label="Amount"
        placeholder="$21.45"
        currency
      />
    </FormDialog>
  );
}
