import { type FileRouter, createUploadthing } from 'uploadthing/next';

const f = createUploadthing();

export const receiptFileRouter = {
  receipts: f({ pdf: { maxFileCount: 1, maxFileSize: '512KB' } }).onUploadComplete(() => ({}))
} satisfies FileRouter;

export type ReceiptFileRouter = typeof receiptFileRouter;