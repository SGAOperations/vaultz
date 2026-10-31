import { type FileRouter, createUploadthing } from 'uploadthing/next';

import { UploadThingError } from 'uploadthing/server';

import { getCapabilities } from '@/lib/permissions';

const f = createUploadthing();

export const receiptFileRouter = {
  receipts: f({
    image: { maxFileCount: 5, maxFileSize: '1MB' },
    pdf: { maxFileCount: 5, maxFileSize: '512KB' },
  })
    // Runs on the browser's upload request only, not on UploadThing's
    // server callback, so the callback stays reachable without a session.
    .middleware(async () => {
      if (!(await getCapabilities()).edit)
        throw new UploadThingError('You do not have permission to upload.');
      return {};
    })
    .onUploadComplete(() => ({})),
} satisfies FileRouter;

export type ReceiptFileRouter = typeof receiptFileRouter;
