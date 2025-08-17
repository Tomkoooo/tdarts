import { ErrorService, LogContext } from '@/database/services/error.service';

export class BadRequestError extends Error {
  constructor(
    message: string,
    public category: 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database' = 'system',
    public context?: LogContext
  ) {
    super(message);
    this.name = 'BadRequestError';
    
    // Log the error to database
    ErrorService.logError(message, this, category, context).catch(console.error);
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public category: 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database' = 'system',
    public context?: LogContext
  ) {
    super(message);
    this.name = 'ValidationError';
    
    // Log the error to database
    ErrorService.logError(message, this, category, context).catch(console.error);
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public category: 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database' = 'auth',
    public context?: LogContext
  ) {
    super(message);
    this.name = 'AuthorizationError';
    
    // Log the error to database
    ErrorService.logError(message, this, category, context).catch(console.error);
  }
}

export function handleError(error: unknown, context?: LogContext): { status: number; body: { error: string } } {
  if (error instanceof BadRequestError) {
    return { status: 400, body: { error: error.message } };
  }
  
  if (error instanceof ValidationError) {
    return { status: 400, body: { error: error.message } };
  }
  
  if (error instanceof AuthorizationError) {
    return { status: 403, body: { error: error.message } };
  }
  
  // Log unexpected errors
  if (error instanceof Error) {
    ErrorService.logError('Unexpected error occurred', error, 'system', context).catch(console.error);
  } else {
    ErrorService.logError('Unexpected error occurred', String(error), 'system', context).catch(console.error);
  }
  
  console.error('Unexpected error:', error);
  return { status: 500, body: { error: 'Internal server error' } };
}

export function errorHandle(error: unknown, context?: LogContext): { status: number; body: { error: string } } {
  return handleError(error, context);
}