import { type FileRouter, createUploadthing } from 'uploadthing/next';

const f = createUploadthing();

export const receiptFileRouter = {
  receipts: f({
    image: { maxFileCount: 5, maxFileSize: '1MB' },
    pdf: { maxFileCount: 5, maxFileSize: '512KB' },
  }).onUploadComplete(() => ({})),
} satisfies FileRouter;

export type ReceiptFileRouter = typeof receiptFileRouter;
