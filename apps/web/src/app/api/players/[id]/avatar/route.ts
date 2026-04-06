import { handlePlayerAvatarGet, handlePlayerAvatarPost } from '@tdarts/api/rest-handlers';

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handlePlayerAvatarGet(id);
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handlePlayerAvatarPost(request, id, { mode: 'web' });
}
