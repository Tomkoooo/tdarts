import { z } from 'zod';
import { ENTRY_FEE_CURRENCY_CODES } from '@tdarts/core/entry-fee-currency';

// ---------------------------------------------------------------------------
// Base validators (single source of truth for all validation messages)
// ---------------------------------------------------------------------------

export const emailValidator = z
  .string()
  .min(1, 'Az email cím megadása kötelező')
  .email('Érvénytelen email cím formátum');

export const passwordValidator = z
  .string()
  .min(8, 'A jelszónak legalább 8 karakter hosszúnak kell lennie')
  .regex(/[A-Z]/, 'A jelszónak tartalmaznia kell legalább egy nagybetűt')
  .regex(/[a-z]/, 'A jelszónak tartalmaznia kell legalább egy kisbetűt')
  .regex(/[0-9]/, 'A jelszónak tartalmaznia kell legalább egy számot');

export const usernameValidator = z
  .string()
  .min(3, 'A felhasználónévnek legalább 3 karakter hosszúnak kell lennie')
  .max(20, 'A felhasználónév maximum 20 karakter hosszú lehet')
  .regex(/^[a-zA-Z0-9_]+$/, 'A felhasználónév csak betűket, számokat és aláhúzást tartalmazhat');

export const nameValidator = z
  .string()
  .min(2, 'A névnek legalább 2 karakter hosszúnak kell lennie')
  .max(50, 'A név maximum 50 karakter hosszú lehet');

export const phoneValidator = z
  .string()
  .regex(/^\+?[0-9]{9,15}$/, 'Érvénytelen telefonszám formátum')
  .optional()
  .or(z.literal(''));

export const urlValidator = z
  .string()
  .url('Érvénytelen URL formátum')
  .optional()
  .or(z.literal(''));

export const positiveNumberValidator = z.number().positive('Az értéknek pozitívnak kell lennie');
export const nonNegativeNumberValidator = z.number().nonnegative('Az érték nem lehet negatív');

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailValidator,
  password: z.string().min(1, 'A jelszó megadása kötelező'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Google Sign-In / OAuth id_token (mobile or web client). */
export const googleIdTokenSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});
export type GoogleIdTokenInput = z.infer<typeof googleIdTokenSchema>;

/** Stripe Checkout session verification (native / REST). */
export const paymentVerifySchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
});
export type PaymentVerifyInput = z.infer<typeof paymentVerifySchema>;

export const registerSchema = z
  .object({
    name: nameValidator,
    email: emailValidator,
    password: passwordValidator,
    confirmPassword: z.string(),
    username: usernameValidator.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'A jelszavak nem egyeznek',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailValidator });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    email: emailValidator,
    password: passwordValidator,
    confirmPassword: z.string(),
    /** 6-digit code from email or opaque token from magic link */
    token: z.string().min(6, 'Érvénytelen kód vagy link'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'A jelszavak nem egyeznek',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  email: emailValidator,
  code: z.string().regex(/^\d{6}$/, 'A kódnak 6 számjegyből kell állnia'),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const verifyEmailTokenSchema = z.object({
  token: z.string().min(16, 'Érvénytelen link'),
});
export type VerifyEmailTokenInput = z.infer<typeof verifyEmailTokenSchema>;

export const requestMagicLinkSchema = z.object({ email: emailValidator });
export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;

export const consumeMagicLoginSchema = z.object({
  token: z.string().min(16, 'Érvénytelen link'),
});
export type ConsumeMagicLoginInput = z.infer<typeof consumeMagicLoginSchema>;

export const completeLegalAndCountrySchema = z.object({
  acceptTerms: z.boolean().refine((v) => v === true, { message: 'Az elfogadás kötelező' }),
  country: z.string().min(2).max(2).optional(),
});
export type CompleteLegalAndCountryInput = z.infer<typeof completeLegalAndCountrySchema>;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

// ---------------------------------------------------------------------------
// Tournament schemas
// ---------------------------------------------------------------------------

export const createTournamentSchema = z.object({
  name: z.string().min(3, 'A verseny nevének legalább 3 karakter hosszúnak kell lennie'),
  description: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional(),
  maxPlayers: positiveNumberValidator,
  format: z.enum(['single-elimination', 'double-elimination', 'round-robin', 'group_knockout']),
  gameType: z.enum(['501', '301', 'cricket']),
  legsToWin: positiveNumberValidator,
  setsToWin: positiveNumberValidator.optional(),
  isPublic: z.boolean().default(true),
  password: z
    .string()
    .min(4, 'A jelszónak legalább 4 karakter hosszúnak kell lennie')
    .optional(),
  boards: z
    .array(
      z.object({
        number: positiveNumberValidator,
        name: z.string().optional(),
      }),
    )
    .min(1, 'Legalább egy tábla szükséges'),
  clubId: z.string().optional(),
  entryFee: nonNegativeNumberValidator.optional(),
  entryFeeCurrency: z
    .enum([...ENTRY_FEE_CURRENCY_CODES] as [string, ...string[]])
    .optional(),
  participationMode: z.enum(['individual', 'team', 'doubles']).optional(),
});
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

export const updateTournamentSchema = createTournamentSchema.partial();
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

export const tournamentCodeSchema = z.object({
  code: z.string().min(3, 'Érvénytelen verseny kód'),
});

export const joinTournamentSchema = z.object({
  code: z.string(),
  password: z.string().optional(),
});
export type JoinTournamentInput = z.infer<typeof joinTournamentSchema>;

// ---------------------------------------------------------------------------
// Club schemas
// ---------------------------------------------------------------------------

export const createClubSchema = z.object({
  name: z.string().min(3, 'A klub nevének legalább 3 karakter hosszúnak kell lennie'),
  description: z.string().optional(),
  location: z.string().min(2, 'A helyszín megadása kötelező'),
  city: z.string().min(2, 'A város megadása kötelező'),
  address: z.string().min(2, 'A cím megadása kötelező'),
  phone: phoneValidator,
  email: emailValidator.optional().or(z.literal('')),
  website: urlValidator,
  logo: z.string().url('Érvénytelen URL').optional().or(z.literal('')),
  isPublic: z.boolean().default(true),
});
export type CreateClubInput = z.infer<typeof createClubSchema>;

export const updateClubSchema = createClubSchema.partial();
export type UpdateClubInput = z.infer<typeof updateClubSchema>;

// ---------------------------------------------------------------------------
// Search schemas
// ---------------------------------------------------------------------------

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Keresési kifejezés megadása kötelező').max(200),
  tab: z.enum(['all', 'tournaments', 'clubs', 'players', 'leagues']).optional(),
  locale: z.enum(['hu', 'en', 'de']).optional(),
  ...paginationSchema.shape,
});
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

// ---------------------------------------------------------------------------
// Match / score schemas
// ---------------------------------------------------------------------------

export const scoreValidator = z.object({
  legsWon: nonNegativeNumberValidator,
  setsWon: nonNegativeNumberValidator.optional(),
  average: nonNegativeNumberValidator.optional(),
  highestCheckout: nonNegativeNumberValidator.optional(),
  oneEightiesCount: nonNegativeNumberValidator.optional(),
});

export const updateMatchScoreSchema = z.object({
  player1Score: scoreValidator,
  player2Score: scoreValidator,
  status: z.enum(['scheduled', 'in_progress', 'finished', 'cancelled']),
});
export type UpdateMatchScoreInput = z.infer<typeof updateMatchScoreSchema>;
