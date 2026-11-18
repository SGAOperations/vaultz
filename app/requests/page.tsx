import { Metadata } from 'next';
import Link from 'next/link';

import { hasAnyPosition } from '@nusgaops/sgauth';
import { Settings2 } from 'lucide-react';

import {
  getRequestFormOptions,
  listPurchaseRequests,
} from '@/prisma/services/purchase-request';
import { getRequestAccess } from '@/prisma/services/request-access';

import { VPOA } from '@/lib/permissions';
import { OPEN_REQUEST_STATUSES } from '@/lib/purchase-request';
import { PurchaseRequestSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

import { PageHeader } from '@/components/page-header';
import { RequestDialog } from '@/components/purchase-requests/request-dialog';
import { RequestList } from '@/components/purchase-requests/request-list';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Purchase Requests' };

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'approval', label: 'Awaiting my approval' },
  { key: 'signoff', label: 'Awaiting my sign-off' },
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Mine' },
] as const;

type Tab = (typeof TABS)[number]['key'];

export default async function PurchaseRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const access = await getRequestAccess();
  if (!access.canUseRequests) return null;

  const { view } = await searchParams;
  const isVpoa = hasAnyPosition(access.session, [VPOA]);
  // Only editors see every request; everyone else sees the ones they're part
  // of, and what's waiting on them.
  const tabs = access.canEdit
    ? TABS.filter((t) => t.key !== 'signoff' || isVpoa)
    : TABS.filter((t) => t.key === 'mine' || t.key === 'approval');
  const tab: Tab = tabs.some((t) => t.key === view)
    ? (view as Tab)
    : access.canEdit
      ? 'open'
      : 'mine';

  const [requests, formOptions] = await Promise.all([
    listPurchaseRequests({
      scope: tab === 'mine' || !access.canEdit ? 'mine' : 'all',
    }),
    access.canRequest ? getRequestFormOptions() : null,
  ]);
  // Waiting on the viewer as the E-Board purchaser or the divisional head.
  const awaitsMe = (r: PurchaseRequestSummary) =>
    (r.status === 'PURCHASER_REVIEW' && r.purchaser?.id === access.user.id) ||
    (r.status === 'HEAD_REVIEW' &&
      r.headPositionKey !== null &&
      hasAnyPosition(access.session, [r.headPositionKey]));
  const shown =
    tab === 'open'
      ? requests.filter((r) => OPEN_REQUEST_STATUSES.includes(r.status))
      : tab === 'approval'
        ? requests.filter(awaitsMe)
        : tab === 'signoff'
          ? requests.filter(
              (r) => r.status === 'APPROVED' && r.signedOffAt === null,
            )
          : requests;

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        title="Purchase Requests"
        description={
          access.canEdit
            ? 'Review and track purchase requests from SGA leadership'
            : 'Request purchases for your division and track their status'
        }
        actions={
          <>
            {access.canEdit && (
              <Link href="/requests/settings">
                <Button variant="outline" className="gap-2">
                  <Settings2 className="size-4" />
                  Settings
                </Button>
              </Link>
            )}
            {formOptions && <RequestDialog options={formOptions} />}
          </>
        }
      />

      {tabs.length > 1 && (
        <nav className="bg-muted flex w-fit gap-1 rounded-lg p-1">
          {tabs.map(({ key, label }) => (
            <Link
              key={key}
              href={`/requests?view=${key}`}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                tab === key
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      <RequestList
        requests={shown}
        showRequester={shown.some((r) => r.requester.id !== access.user.id)}
        emptyMessage={
          tab === 'open'
            ? 'No requests waiting on a decision'
            : tab === 'approval'
              ? 'Nothing awaiting your approval'
              : tab === 'signoff'
                ? 'Nothing awaiting your sign-off'
                : 'No purchase requests yet'
        }
      />
    </div>
  );
}
