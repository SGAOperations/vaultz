// SGAuth replaces the passphrase gate once SGAUTH_ENABLED is 'true'. Until the
// cutover the gate stays the default, so rollback is a single env var flip.
export const SSO_UNAVAILABLE_PATH = '/sso-unavailable';

export function isSgauthEnabled(): boolean {
  return process.env.SGAUTH_ENABLED === 'true';
}

// SGAuth sends the user back to this origin after sign-out, so it has to be
// the origin this app is served from. Local hosts are served over http.
export function appOrigin(host: string): string {
  const hostname = host.split(':')[0];
  const isLocal = hostname === 'localhost' || hostname.endsWith('.localhost');
  return `${isLocal ? 'http' : 'https'}://${host}`;
}
