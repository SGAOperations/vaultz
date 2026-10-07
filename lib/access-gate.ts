import { createHash, createHmac, timingSafeEqual } from 'crypto';

// Single shared passphrase gate — not real authentication. It has no
// per-user identity or permissions, it only keeps casual/unauthorized
// visitors out of a shared link. Replace this with proper per-user auth
// once that exists.

export const ACCESS_COOKIE_NAME = 'vaultz_access';
export const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getAccessSecret(): string {
  const secret = process.env.VAULTZ_ACCESS_SECRET;
  if (!secret)
    throw new Error('VAULTZ_ACCESS_SECRET environment variable is not set');
  return secret;
}

function getAccessCode(): string {
  const code = process.env.VAULTZ_ACCESS_CODE;
  if (!code)
    throw new Error('VAULTZ_ACCESS_CODE environment variable is not set');
  return code;
}

function sign(payload: string): string {
  return createHmac('sha256', getAccessSecret())
    .update(payload)
    .digest('base64url');
}

export function signAccessCookieValue(): string {
  const expiresAt = String(Date.now() + ACCESS_COOKIE_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifyAccessCookieValue(raw: string | undefined): boolean {
  if (!raw) return false;

  const [expiresAt, signature] = raw.split('.');
  if (!expiresAt || !signature) return false;

  const expected = Buffer.from(sign(expiresAt));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  if (!timingSafeEqual(expected, actual)) return false;

  return Number(expiresAt) > Date.now();
}

export function verifyPassphrase(candidate: string): boolean {
  const candidateHash = createHash('sha256').update(candidate).digest();
  const expectedHash = createHash('sha256').update(getAccessCode()).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}
