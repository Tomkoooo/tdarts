/**
 * OpenAPI 3.0 artifact generator for @tdarts/api.
 *
 * Status: SPIKE — @trpc/openapi@11.x requires Zod v4; currently pinned to v3.
 * When the project upgrades to Zod v4, uncomment the live generator below and
 * run `pnpm --filter @tdarts/api generate:openapi`.
 *
 * All routers already carry `.meta({ openapi: { method, path, tags, protect } })`
 * annotations — no router changes are needed when you upgrade.
 *
 * Native (Swift/Kotlin) teams can consume the generated openapi.json directly.
 * Capacitor/React teams use the AppRouter type exported from @tdarts/api.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { appRouter } from '../root';

const OUTPUT_PATH = join(import.meta.url ? new URL('.', import.meta.url).pathname : __dirname, '..', '..', '..', 'openapi.json');

export async function generateOpenApiDocument() {
  /* ─── LIVE GENERATOR (Zod v4 + @trpc/openapi) ─────────────────────────────
   *
   * Uncomment when Zod v4 is available in the workspace:
   *
   * const { generateOpenApiDocument } = await import('@trpc/openapi');
   * const doc = generateOpenApiDocument(appRouter, {
   *   title: 'tDarts API',
   *   description: 'Mobile-first API for tDarts tournament platform.',
   *   version: '1.0.0',
   *   baseUrl: process.env.API_PUBLIC_URL ?? 'https://api.tdarts.hu',
   *   tags: ['auth', 'tournament', 'club', 'search'],
   *   docsUrl: 'https://tdarts.hu/api-docs',
   *   securitySchemes: {
   *     callerAuth: {
   *       type: 'apiKey',
   *       in: 'header',
   *       name: 'X-Client-Id',
   *       description: 'Tier 1 — Mobile app or integration caller ID',
   *     },
   *     bearerAuth: {
   *       type: 'http',
   *       scheme: 'bearer',
   *       bearerFormat: 'JWT',
   *       description: 'Tier 2 — Platform user JWT (from auth.login)',
   *     },
   *   },
   * });
   * writeFileSync(OUTPUT_PATH, JSON.stringify(doc, null, 2));
   * console.log(`[openapi] Generated ${OUTPUT_PATH}`);
   *
   * ──────────────────────────────────────────────────────────────────────── */

  // Stub output until Zod v4
  const stub = buildStubOpenApiDocument();
  writeFileSync(OUTPUT_PATH, JSON.stringify(stub, null, 2));
  console.log('[openapi] Stub generated at', OUTPUT_PATH);
  console.log('[openapi] NOTE: Upgrade to Zod v4 to enable live @trpc/openapi generation.');
}

/**
 * Minimal hand-crafted OpenAPI 3.0 stub covering all routers' .meta annotations.
 * Replace with the live generator above once Zod v4 is available.
 */
function buildStubOpenApiDocument() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'tDarts API',
      version: '1.0.0',
      description: 'Mobile-first API for the tDarts tournament platform.\n\n## Authentication\n\n**Tier 1 (Caller)**: Every request must include `X-Client-Id` + `X-Client-Secret` (mobile builds) or `X-Integration-Key` (approved integrations).\n\n**Tier 2 (User)**: User-scoped procedures require `Authorization: Bearer <user_jwt>` obtained from `auth.login`.',
    },
    servers: [
      { url: 'https://api.tdarts.hu', description: 'Production' },
      { url: 'http://localhost:4000', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        callerClientId: { type: 'apiKey', in: 'header', name: 'X-Client-Id' },
        callerClientSecret: { type: 'apiKey', in: 'header', name: 'X-Client-Secret' },
        integrationKey: { type: 'apiKey', in: 'header', name: 'X-Integration-Key' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ callerClientId: [], callerClientSecret: [] }],
    tags: [
      { name: 'auth', description: 'Authentication and user identity' },
      { name: 'tournament', description: 'Tournament management and viewing' },
      { name: 'club', description: 'Club management and membership' },
      { name: 'search', description: 'Global search across entities' },
    ],
    paths: {
      '/trpc/auth.login': {
        post: { tags: ['auth'], summary: 'Login with email + password', operationId: 'authLogin',
          description: 'Returns user_jwt for Tier 2 auth on subsequent calls.',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['json'], properties: { json: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 1 } } } } } } } },
          responses: { 200: { description: 'Login successful', content: { 'application/json': { schema: { type: 'object', properties: { result: { type: 'object', properties: { data: { type: 'object', properties: { token: { type: 'string' }, user: { type: 'object' } } } } } } } } } } },
        },
      },
      '/trpc/auth.register': { post: { tags: ['auth'], summary: 'Register new user account', operationId: 'authRegister' } },
      '/trpc/auth.verifyEmail': { post: { tags: ['auth'], summary: 'Verify email with 4-digit code', operationId: 'authVerifyEmail' } },
      '/trpc/auth.forgotPassword': { post: { tags: ['auth'], summary: 'Initiate forgot password flow', operationId: 'authForgotPassword' } },
      '/trpc/auth.resetPassword': { post: { tags: ['auth'], summary: 'Reset password via token', operationId: 'authResetPassword' } },
      '/trpc/auth.ping': { get: { tags: ['auth'], summary: 'Tier 1 health check', operationId: 'authPing', security: [{ callerClientId: [], callerClientSecret: [] }] } },
      '/trpc/tournament.getPageData': { get: { tags: ['tournament'], summary: 'Get full tournament page data', operationId: 'tournamentGetPageData' } },
      '/trpc/tournament.getLite': { get: { tags: ['tournament'], summary: 'Get lightweight tournament summary', operationId: 'tournamentGetLite' } },
      '/trpc/tournament.create': { post: { tags: ['tournament'], summary: 'Create a new tournament', operationId: 'tournamentCreate', security: [{ callerClientId: [], callerClientSecret: [], bearerAuth: [] }] } },
      '/trpc/tournament.update': { post: { tags: ['tournament'], summary: 'Update tournament settings', operationId: 'tournamentUpdate' } },
      '/trpc/tournament.join': { post: { tags: ['tournament'], summary: 'Join a tournament as authenticated user', operationId: 'tournamentJoin' } },
      '/trpc/tournament.getUserRole': { get: { tags: ['tournament'], summary: 'Get current user role in tournament', operationId: 'tournamentGetUserRole' } },
      '/trpc/tournament.getBracket': { get: { tags: ['tournament'], summary: 'Get knockout/bracket view', operationId: 'tournamentGetBracket' } },
      '/trpc/tournament.getGroups': { get: { tags: ['tournament'], summary: 'Get group stage view', operationId: 'tournamentGetGroups' } },
      '/trpc/club.getById': { get: { tags: ['club'], summary: 'Get club by ID', operationId: 'clubGetById' } },
      '/trpc/club.getSummary': { get: { tags: ['club'], summary: 'Get club summary (cards)', operationId: 'clubGetSummary' } },
      '/trpc/club.getMyClubs': { get: { tags: ['club'], summary: 'Get clubs for authenticated user', operationId: 'clubGetMyClubs', security: [{ callerClientId: [], callerClientSecret: [], bearerAuth: [] }] } },
      '/trpc/club.create': { post: { tags: ['club'], summary: 'Create a new club', operationId: 'clubCreate' } },
      '/trpc/club.update': { post: { tags: ['club'], summary: 'Update club details', operationId: 'clubUpdate' } },
      '/trpc/club.join': { post: { tags: ['club'], summary: 'Join a club as member', operationId: 'clubJoin' } },
      '/trpc/club.removeMember': { post: { tags: ['club'], summary: 'Remove a club member', operationId: 'clubRemoveMember' } },
      '/trpc/search.global': { get: { tags: ['search'], summary: 'Global search across all entities', operationId: 'searchGlobal' } },
      '/trpc/search.metadata': { get: { tags: ['search'], summary: 'Search filter metadata (cities etc)', operationId: 'searchMetadata' } },
    },
  };
}

// Allow running as script: ts-node / tsx src/trpc/openapi/generate.ts
if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('generate.ts'))) {
  generateOpenApiDocument().catch(console.error);
}
