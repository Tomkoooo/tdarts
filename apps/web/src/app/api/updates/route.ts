import { handleUpdatesGet } from '@tdarts/api/rest-handlers';

export async function GET() {
  return handleUpdatesGet();
}
