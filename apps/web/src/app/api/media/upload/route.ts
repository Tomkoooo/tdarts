import { handleMediaUploadPost } from '@tdarts/api/rest-handlers';

export async function POST(request: Request) {
  return handleMediaUploadPost(request, { mode: 'web' });
}
