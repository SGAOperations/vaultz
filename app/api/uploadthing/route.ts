import { createRouteHandler } from 'uploadthing/next';

import { receiptFileRouter } from './core';

export const { GET, POST } = createRouteHandler({ router: receiptFileRouter });
