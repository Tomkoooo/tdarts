import { z } from "zod"

/**
 * Common validation schemas and utilities
 */

// ============================================================================
// Base Validators
// ============================================================================

export const emailValidator = z
  .string()
  .min(1, "Az email cím megadása kötelező")
  .email("Érvénytelen email cím formátum")

export const passwordValidator = z
  .string()
  .min(8, "A jelszónak legalább 8 karakter hosszúnak kell lennie")
  .regex(/[A-Z]/, "A jelszónak tartalmaznia kell legalább egy nagybetűt")
  .regex(/[a-z]/, "A jelszónak tartalmaznia kell legalább egy kisbetűt")
  .regex(/[0-9]/, "A jelszónak tartalmaznia kell legalább egy számot")

export const usernameValidator = z
  .string()
  .min(3, "A felhasználónévnek legalább 3 karakter hosszúnak kell lennie")
  .max(20, "A felhasználónév maximum 20 karakter hosszú lehet")
  .regex(/^[a-zA-Z0-9_]+$/, "A felhasználónév csak betűket, számokat és aláhúzást tartalmazhat")

export const nameValidator = z
  .string()
  .min(2, "A névnek legalább 2 karakter hosszúnak kell lennie")
  .max(50, "A név maximum 50 karakter hosszú lehet")
  .regex(/^[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ\s]+$/, "A név csak betűket tartalmazhat")

export const phoneValidator = z
  .string()
  .regex(/^\+?[0-9]{9,15}$/, "Érvénytelen telefonszám formátum")
  .optional()
  .or(z.literal(""))

export const urlValidator = z
  .string()
  .url("Érvénytelen URL formátum")
  .optional()
  .or(z.literal(""))

export const positiveNumberValidator = z
  .number()
  .positive("Az értéknek pozitívnak kell lennie")

export const nonNegativeNumberValidator = z
  .number()
  .nonnegative("Az érték nem lehet negatív")

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  email: emailValidator,
  password: z.string().min(1, "A jelszó megadása kötelező"),
  rememberMe: z.boolean().optional(),
})

export const registerSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  password: passwordValidator,
  confirmPassword: z.string(),
  username: usernameValidator.optional(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "El kell fogadnod a felhasználási feltételeket",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"],
})

export const forgotPasswordSchema = z.object({
  email: emailValidator,
})

export const resetPasswordSchema = z.object({
  email: emailValidator,
  password: passwordValidator,
  confirmPassword: z.string(),
  token: z.string().min(1, "Érvénytelen token"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"],
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "A jelenlegi jelszó megadása kötelező"),
  newPassword: passwordValidator,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"],
})

// ============================================================================
// Tournament Schemas
// ============================================================================

export const createTournamentSchema = z.object({
  name: z.string().min(3, "A verseny nevének legalább 3 karakter hosszúnak kell lennie"),
  description: z.string().optional(),
  location: z.string().optional(), // Generic location string
  city: z.string().optional(), // For structured input
  address: z.string().optional(), // For structured input
  startDate: z.date({
    required_error: "A kezdési dátum megadása kötelező",
  }),
  endDate: z.date().optional(),
  maxPlayers: positiveNumberValidator,
  format: z.enum(["single-elimination", "double-elimination", "round-robin", "group_knockout"], {
    required_error: "A verseny formátumának kiválasztása kötelező",
  }),
  gameType: z.enum(["501", "301", "cricket"], {
    required_error: "A játék típusának kiválasztása kötelező",
  }),
  legsToWin: positiveNumberValidator,
  setsToWin: positiveNumberValidator.optional(),
  isPublic: z.boolean().default(true),
  password: z.string().min(4, "A jelszónak legalább 4 karakter hosszúnak kell lennie").optional(),
  boards: z.array(z.object({
    number: positiveNumberValidator,
    name: z.string().optional(),
  })).min(1, "Legalább egy tábla szükséges"),
})

export const updateTournamentSchema = createTournamentSchema.partial()

// ============================================================================
// Club Schemas
// ============================================================================

export const createClubSchema = z.object({
  name: z.string().min(3, "A klub nevének legalább 3 karakter hosszúnak kell lennie"),
  description: z.string().optional(),
  location: z.string().min(2, "A helyszín megadása kötelező"), // Kept for backend compatibility, but constructed from city + address
  city: z.string().min(2, "A város megadása kötelező"),
  address: z.string().min(2, "A cím megadása kötelező"),
  phone: phoneValidator,
  email: emailValidator.optional().or(z.literal("")),
  website: urlValidator,
  logo: z.string().url("Érvénytelen URL").optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
})

export const updateClubSchema = createClubSchema.partial()

// ============================================================================
// Player Schemas
// ============================================================================

export const addPlayerSchema = z.object({
  name: nameValidator,
  email: emailValidator.optional().or(z.literal("")),
  phone: phoneValidator,
  birthDate: z.date().optional(),
  notes: z.string().max(500, "A megjegyzés maximum 500 karakter hosszú lehet").optional(),
})

// ============================================================================
// Match Schemas
// ============================================================================

export const scoreValidator = z.object({
  legsWon: nonNegativeNumberValidator,
  setsWon: nonNegativeNumberValidator.optional(),
  average: nonNegativeNumberValidator.optional(),
  highestCheckout: nonNegativeNumberValidator.optional(),
  oneEightiesCount: nonNegativeNumberValidator.optional(),
})

export const updateMatchScoreSchema = z.object({
  player1Score: scoreValidator,
  player2Score: scoreValidator,
  status: z.enum(["scheduled", "in_progress", "finished", "cancelled"]),
})

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates if a date is in the future
 */
export function isFutureDate(date: Date): boolean {
  return date > new Date()
}

/**
 * Validates if end date is after start date
 */
export function isEndDateAfterStartDate(startDate: Date, endDate: Date): boolean {
  return endDate > startDate
}

/**
 * Custom validator for date range
 */
export const dateRangeValidator = (startDateField: string, endDateField: string) => {
  return z.object({
    [startDateField]: z.date(),
    [endDateField]: z.date(),
  }).refine(
    (data) => data[endDateField as keyof typeof data] > data[startDateField as keyof typeof data],
    {
      message: "A befejezési dátumnak a kezdési dátum után kell lennie",
      path: [endDateField],
    }
  )
}

/**
 * Validates if a string is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id)
}

/**
 * Creates a conditional required validator
 */
export function conditionalRequired<T>(condition: boolean, validator: z.ZodType<T>) {
  return condition ? validator : z.any().optional()
}

/**
 * File upload validator
 */
export const fileValidator = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, "A fájl mérete maximum 5MB lehet")
  .refine(
    (file) => ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type),
    "Csak JPEG, PNG és WebP formátumú képek engedélyezettek"
  )

/**
 * Multiple files validator
 */
export const multipleFilesValidator = z
  .array(fileValidator)
  .max(10, "Maximum 10 fájl tölthető fel egyszerre")

// ============================================================================
// Export Types
// ============================================================================

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

export type CreateTournamentFormData = z.infer<typeof createTournamentSchema>
export type UpdateTournamentFormData = z.infer<typeof updateTournamentSchema>

export type CreateClubFormData = z.infer<typeof createClubSchema>
export type UpdateClubFormData = z.infer<typeof updateClubSchema>

export type AddPlayerFormData = z.infer<typeof addPlayerSchema>

export type UpdateMatchScoreFormData = z.infer<typeof updateMatchScoreSchema>

