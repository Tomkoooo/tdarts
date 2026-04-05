/**
 * Unit tests for mapServiceError utility.
 */
import { TRPCError } from '@trpc/server';
import { mapServiceError } from '../trpc/errors/mapServiceError';
import { BadRequestError, ValidationError, AuthorizationError } from '@tdarts/core';
import { ZodError } from 'zod';

describe('mapServiceError', () => {
  it('passes through TRPCError unchanged', () => {
    const err = new TRPCError({ code: 'NOT_FOUND', message: 'not found' });
    expect(mapServiceError(err)).toBe(err);
  });

  it('maps AuthorizationError → FORBIDDEN', () => {
    const err = new AuthorizationError('Not allowed', 'auth');
    const mapped = mapServiceError(err);
    expect(mapped.code).toBe('FORBIDDEN');
    expect(mapped.message).toBe('Not allowed');
  });

  it('maps ValidationError → BAD_REQUEST', () => {
    const err = new ValidationError('Invalid input', 'tournament');
    const mapped = mapServiceError(err);
    expect(mapped.code).toBe('BAD_REQUEST');
  });

  it('maps BadRequestError → BAD_REQUEST', () => {
    const err = new BadRequestError('Bad', 'club');
    expect(mapServiceError(err).code).toBe('BAD_REQUEST');
  });

  it('maps BadRequestError with statusCode 404 → NOT_FOUND', () => {
    const err = new BadRequestError('Not found', 'tournament', undefined, { statusCode: 404 } as any);
    // statusCode is set in constructor override
    err.statusCode = 404;
    expect(mapServiceError(err).code).toBe('NOT_FOUND');
  });

  it('maps ZodError → BAD_REQUEST', () => {
    const err = new ZodError([{ path: ['email'], message: 'Invalid email', code: 'invalid_string', validation: 'email' }]);
    expect(mapServiceError(err).code).toBe('BAD_REQUEST');
  });

  it('maps generic Error → INTERNAL_SERVER_ERROR', () => {
    const err = new Error('Something went wrong');
    expect(mapServiceError(err).code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('maps unknown non-Error → INTERNAL_SERVER_ERROR', () => {
    expect(mapServiceError('crash')).toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
  });
});
