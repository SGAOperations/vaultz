// SGAuth replaces the passphrase gate once SGAUTH_ENABLED is 'true'. Until the
// cutover the gate stays the default, so rollback is a single env var flip.
export function isSgauthEnabled(): boolean {
  return process.env.SGAUTH_ENABLED === 'true';
}
