export const SSO_UNAVAILABLE_PATH = '/sso-unavailable';

// SGAuth sends the user back to this origin after sign-out, so it has to be
// the origin this app is served from. Local hosts are served over http.
export function appOrigin(host: string): string {
  const hostname = host.split(':')[0];
  const isLocal = hostname === 'localhost' || hostname.endsWith('.localhost');
  return `${isLocal ? 'http' : 'https'}://${host}`;
}
