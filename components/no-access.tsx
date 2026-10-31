import { accountUrl, logoutUrl } from '@nusgaops/sgauth/urls';

import { Card, CardContent } from '@/components/ui/card';

export function NoAccess() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-3">
          <h1 className="text-xl font-bold tracking-tight">No access</h1>
          <p className="text-muted-foreground text-sm">
            Your SGA positions don&apos;t include access to VaultZ. If you think
            this is wrong, check your positions on your SGAuth account or ask
            the Vice President of Operational Affairs.
          </p>
          <div className="flex gap-4 text-sm">
            <a href={accountUrl()} className="text-primary underline">
              Your SGAuth account
            </a>
            <a href={logoutUrl()} className="text-primary underline">
              Sign out
            </a>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
