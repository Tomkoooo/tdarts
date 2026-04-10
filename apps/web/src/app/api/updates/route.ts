import type { NextRequest } from 'next/server';
import { handleUpdatesGet } from '@tdarts/api/rest-handlers';
import { createSseUpdatesResponse, requestWantsSse } from '@/app/api/updates/sseUpdatesResponse';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (requestWantsSse(request)) {
    return createSseUpdatesResponse(request);
  }
  return handleUpdatesGet();
}
