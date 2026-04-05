/**
 * Optional Next.js tRPC bridge.
 *
 * This file is a thin re-export of the standalone @tdarts/api handler so the
 * same tRPC server can be co-hosted alongside the Next.js app during local
 * development or a shared-host transition period.
 *
 * - Web pages / Server Actions do NOT call this route.
 * - Mobile clients may target this URL or a dedicated API host — configure
 *   NEXT_PUBLIC_API_URL in the mobile app to switch.
 * - This file must not alter any other apps/web routes or middleware.
 * - Remove this file when the API runs exclusively on its own host.
 */
import { createHandler } from '@tdarts/api';

export const GET = (req: Request) => createHandler(req);
export const POST = (req: Request) => createHandler(req);
