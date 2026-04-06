import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router } from '../init';
import { apiProcedure } from '../procedures';
import { mapServiceError } from '../errors/mapServiceError';
import { AuthService } from '@tdarts/services';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  googleIdTokenSchema,
} from '@tdarts/schemas';

export const authRouter = router({
  /**
   * Login with email + password. Returns user_jwt for subsequent Tier 2 calls.
   * @openapi { method: "POST", path: "/auth.login", tags: ["auth"] }
   */
  login: apiProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/login', tags: ['auth'], protect: false } })
    .input(loginSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await AuthService.login(input.email, input.password);
        return { token: result.token, user: result.user };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Google Sign-In (id_token from native SDK). Same Tier 1 gate + returns platform JWT.
   */
  loginGoogle: apiProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/google', tags: ['auth'], protect: false } })
    .input(googleIdTokenSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await AuthService.loginWithGoogleIdToken(input.idToken);
        return { token: result.token, user: result.user };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Register a new user account.
   * @openapi { method: "POST", path: "/auth.register", tags: ["auth"] }
   */
  register: apiProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/register', tags: ['auth'], protect: false } })
    .input(registerSchema)
    .mutation(async ({ input }) => {
      try {
        await AuthService.register({
          name: input.name,
          email: input.email,
          password: input.password,
          username: input.username ?? input.email.split('@')[0],
        });
        return { ok: true };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Verify email address with the 4-digit code sent to the user.
   */
  verifyEmail: apiProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/verify-email', tags: ['auth'], protect: false } })
    .input(verifyEmailSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await AuthService.verifyEmail(input.email, input.code);
        return { token: result.token };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Initiate forgot-password flow (sends reset email).
   */
  forgotPassword: apiProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/forgot-password', tags: ['auth'], protect: false } })
    .input(forgotPasswordSchema)
    .mutation(async ({ input }) => {
      try {
        await AuthService.forgotPassword(input.email);
        return { ok: true };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Reset password using the token received via email.
   */
  resetPassword: apiProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/reset-password', tags: ['auth'], protect: false } })
    .input(resetPasswordSchema)
    .mutation(async ({ input }) => {
      try {
        await AuthService.resetPassword(input.email, input.token, input.password);
        return { ok: true };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Health check — verifies Tier 1 credentials only.
   */
  ping: apiProcedure
    .meta({ openapi: { method: 'GET', path: '/auth/ping', tags: ['auth'], protect: true } })
    .input(z.void())
    .query(() => ({ ok: true, ts: new Date().toISOString() })),
});
