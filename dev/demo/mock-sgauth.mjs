// A stand-in for SGAuth for the local purchase request demo only. Anyone can
// sign in as any demo role, so it must never run anywhere real.
import { readFileSync } from 'node:fs';
import http from 'node:http';

if (
  process.env.NODE_ENV === 'production' ||
  process.env.DEMO_MOCK_SGAUTH !== '1'
) {
  console.error(
    'mock-sgauth is for the local demo only. Set DEMO_MOCK_SGAUTH=1 outside production to run it.',
  );
  process.exit(1);
}

const PORT = Number(process.env.PORT ?? 3000);
const COOKIE = process.env.SGAUTH_COOKIE_NAME ?? 'sgauth-local.session_token';
// The cookie is shared by auth.sga.localhost and vaultz.sga.localhost.
const COOKIE_DOMAIN = process.env.DEMO_COOKIE_DOMAIN ?? 'sga.localhost';
const APP_URL = process.env.DEMO_APP_URL ?? 'http://vaultz.sga.localhost:3001';

const personas = JSON.parse(
  readFileSync(new URL('./personas.json', import.meta.url), 'utf8'),
);
const byKey = new Map(personas.map((p) => [p.key, p]));

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
}

// Only send people back to local addresses, never to an arbitrary site.
function safeRedirect(value) {
  try {
    const url = new URL(value);
    const local =
      url.hostname === 'localhost' || url.hostname.endsWith('.localhost');
    return (url.protocol === 'http:' || url.protocol === 'https:') && local
      ? url.toString()
      : APP_URL;
  } catch {
    return APP_URL;
  }
}

function currentPersona(req) {
  const match = new RegExp(
    `(?:^|;\\s*)${COOKIE.replace(/\./g, '\\.')}=([^;]+)`,
  ).exec(req.headers.cookie ?? '');
  return match ? byKey.get(decodeURIComponent(match[1])) : undefined;
}

function cookieHeader(value, maxAge) {
  return `${COOKIE}=${encodeURIComponent(value)}; Domain=${COOKIE_DOMAIN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

function sessionFor(persona) {
  return {
    user: {
      id: persona.sgauthUserId,
      email: persona.email,
      name: persona.name,
      preferredName: null,
      isAdmin: false,
      isPrimaryAdmin: false,
    },
    positions: persona.positions,
    session: {
      id: persona.sgauthUserId,
      expiresAt: '2099-01-01T00:00:00.000Z',
      absoluteExpiresAt: '2099-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  };
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f5f3fa; color: #1c1530; margin: 0; padding: 32px 16px; }
  main { max-width: 640px; margin: 0 auto; }
  .note { background: #fff4d6; border: 1px solid #f0d58a; border-radius: 10px; padding: 10px 14px; font-size: 14px; margin-bottom: 20px; }
  a.role { display: block; background: #fff; border: 1px solid #ddd6ee; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; text-decoration: none; color: inherit; }
  a.role:hover { border-color: #6b3fb5; }
  .role strong { color: #4e2a8e; }
  .tag { font-size: 12px; background: #ece6f7; border-radius: 999px; padding: 2px 8px; margin-left: 6px; }
  .muted { color: #5d5670; font-size: 14px; }
</style></head><body><main>${body}</main></body></html>`;
}

function picker(redirect, signedIn) {
  const roles = personas
    .map(
      (
        p,
      ) => `<a class="role" href="/login/as/${encodeURIComponent(p.key)}?redirect=${encodeURIComponent(redirect)}">
  <strong>${escapeHtml(p.name)}</strong><span class="tag">${escapeHtml(p.role)}</span>
  <div class="muted">${escapeHtml(p.positions.map((x) => x.name).join(', '))}: ${escapeHtml(p.summary)}</div>
</a>`,
    )
    .join('\n');
  return page(
    'Demo sign-in',
    `<h1>VaultZ demo sign-in</h1>
<div class="note">Mock SGAuth for the local demo. Pick a role to sign in as; use <em>Sign out</em> in VaultZ to come back here and switch.${
      signedIn
        ? ` Currently signed in as <strong>${escapeHtml(signedIn.name)}</strong>.`
        : ''
    }</div>
${roles}`,
  );
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://mock-sgauth');
  const redirect = safeRedirect(url.searchParams.get('redirect') ?? APP_URL);

  if (url.pathname === '/api/sgauth/session') {
    const persona = currentPersona(req);
    if (!persona) return res.writeHead(401).end();
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(sessionFor(persona)));
  }

  if (url.pathname.startsWith('/login/as/')) {
    const key = decodeURIComponent(url.pathname.slice('/login/as/'.length));
    if (!byKey.has(key)) return res.writeHead(404).end('Unknown demo role');
    res.writeHead(302, {
      'set-cookie': cookieHeader(key, 60 * 60 * 24 * 30),
      location: redirect,
    });
    return res.end();
  }

  if (
    url.pathname === '/login' ||
    url.pathname === '/' ||
    url.pathname === '/account'
  ) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(picker(redirect, currentPersona(req)));
  }

  if (url.pathname === '/logout') {
    res.writeHead(302, {
      'set-cookie': cookieHeader('', 0),
      location: `/login?redirect=${encodeURIComponent(redirect)}`,
    });
    return res.end();
  }

  res.writeHead(404).end('Not found');
});

server.listen(PORT, () => {
  console.log(`mock-sgauth (demo only) listening on :${PORT}`);
});
