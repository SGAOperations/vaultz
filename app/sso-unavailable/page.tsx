import type { Metadata } from 'next';

import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = { title: 'SSO unavailable' };

const DEV_URL = 'https://vaultz-dev.northeasternsga.com';

export default function SsoUnavailablePage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            SSO unavailable on this host
          </h1>
          <p className="text-muted-foreground text-sm">
            SGAuth sign-in only works on northeasternsga.com addresses, so this
            Vercel preview URL can&apos;t sign you in. Preview the dev branch at{' '}
            <a href={DEV_URL} className="text-primary underline">
              vaultz-dev.northeasternsga.com
            </a>{' '}
            instead.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
