import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { getDivisionHeads } from '@/prisma/services/allocation-groups';
import { getAllProcessTemplates } from '@/prisma/services/process-templates';
import { getRequestAccess } from '@/prisma/services/request-access';
import { getRequesterPositions } from '@/prisma/services/requester-position';
import { getUsers } from '@/prisma/services/user';

import { PageHeader } from '@/components/page-header';
import {
  DivisionHeadsEditor,
  EBoardPurchaserList,
  PurchasingMethodList,
  RequesterPositionsEditor,
} from '@/components/purchase-requests/request-settings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = { title: 'Request Settings' };

export default async function RequestSettingsPage() {
  if (!(await getRequestAccess()).canEdit) redirect('/requests');

  const [positions, users, templates, divisions] = await Promise.all([
    getRequesterPositions(),
    getUsers(),
    getAllProcessTemplates(true),
    getDivisionHeads(),
  ]);

  return (
    <div className="flex w-full flex-col gap-4">
      <Link
        href="/requests"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 pt-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Purchase requests
      </Link>
      <PageHeader
        title="Request Settings"
        description="Choose who can submit purchase requests, who approves them, and how purchases can be made"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Requester positions</CardTitle>
            <CardDescription>
              Holders of these SGAuth positions can submit requests against the
              divisions mapped to their position (editors: any division).
              Positions without view access see only the request page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RequesterPositionsEditor
              positions={positions.map(({ id, positionKey }) => ({
                id,
                positionKey,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>E-Board purchasers</CardTitle>
            <CardDescription>
              Every reimbursement must name one of these users as the purchaser,
              who approves it first. The approved purchase is recorded under
              them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EBoardPurchaserList
              users={users.map(
                ({ id, first, last, isEBoardPurchaser, sgauthUserId }) => ({
                  id,
                  first,
                  last,
                  isEBoardPurchaser,
                  signedIn: sgauthUserId !== null,
                }),
              )}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Purchasing methods</CardTitle>
            <CardDescription>
              Requesters choose one of these process templates as the
              purchase&apos;s method. The approved purchase starts that process.
              Reimbursements require an E-Board purchaser; for any other method,
              the approver chooses who the purchase is recorded under.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PurchasingMethodList
              templates={templates.map(
                ({ id, name, isPurchasingMethod, requiresPurchaser }) => ({
                  id,
                  name,
                  isPurchasingMethod,
                  requiresPurchaser,
                }),
              )}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Division heads</CardTitle>
            <CardDescription>
              Holders of a division&apos;s head position approve its requests
              before the Comptroller, unless they made the request or approved
              it as the purchaser. A division with no head, or whose head
              position is vacant in SGAuth, skips this step.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DivisionHeadsEditor divisions={divisions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
