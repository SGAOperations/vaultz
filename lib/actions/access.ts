'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ACCESS_COOKIE_NAME,
  signAccessCookieValue,
  verifyPassphrase,
} from '@/lib/access-gate';

function isSafeRedirectPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

export async function verifyAccessCode(input: {
  passphrase: string;
  from: string;
}) {
  if (!verifyPassphrase(input.passphrase)) {
    return { error: 'Incorrect passphrase' };
  }

  (await cookies()).set(ACCESS_COOKIE_NAME, signAccessCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });

  redirect(isSafeRedirectPath(input.from) ? input.from : '/');
}
