import { handlePaymentsVerifyPost } from '@tdarts/api/rest-handlers';

export async function POST(request: Request) {
  return handlePaymentsVerifyPost(request, { mode: 'web' });
}
