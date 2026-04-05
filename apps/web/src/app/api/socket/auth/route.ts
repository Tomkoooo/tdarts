import { handleSocketAuthPost } from '@tdarts/api/rest-handlers';

export async function POST(request: Request) {
  return handleSocketAuthPost(request, { mode: 'web' });
}
