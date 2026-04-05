import { handlePlayerAvatarPost } from '@tdarts/api/rest-handlers';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handlePlayerAvatarPost(request, id, { mode: 'web' });
}
