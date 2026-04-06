import { TRPCError } from '@trpc/server';
import { BadRequestError, ValidationError, AuthorizationError } from '@tdarts/core';
import { ZodError } from 'zod';

/** Map domain errors from @tdarts/core / @tdarts/services to TRPCError. */
export function mapServiceError(error: unknown): TRPCError {
  if (error instanceof TRPCError) return error;

  if (error instanceof AuthorizationError) {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof ValidationError) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof BadRequestError) {
    return new TRPCError({
      code: error.statusCode === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof ZodError) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Validation failed',
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message, cause: error });
  }

  return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
}

/** Extracts a stable errorCode from a TRPCError cause for the client error shape. */
export function extractErrorCode(error: TRPCError): string | undefined {
  const cause = error.cause;
  if (
    cause instanceof BadRequestError ||
    cause instanceof ValidationError ||
    cause instanceof AuthorizationError
  ) {
    return cause.errorCode;
  }
  return undefined;
}
