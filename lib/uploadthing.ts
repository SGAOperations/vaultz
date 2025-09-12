import { ReceiptFileRouter } from '@/app/api/uploadthing/core';
import {
  generateUploadButton,
  generateUploadDropzone,
} from '@uploadthing/react';

export const UploadButton = generateUploadButton<ReceiptFileRouter>();
export const UploadDropzone = generateUploadDropzone<ReceiptFileRouter>();
