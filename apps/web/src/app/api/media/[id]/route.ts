import { handleMediaGetRequest } from '@tdarts/api/rest-handlers';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return handleMediaGetRequest(request, id);
}
