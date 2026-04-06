export type ErrorCategory = 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database';

export type LogContext = {
  userId?: string;
  clubId?: string;
  tournamentId?: string;
  playerId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  errorType?: string;
  errorCode?: string;
  expected?: boolean;
  operation?: string;
  httpStatus?: number;
  [key: string]: unknown;
};

interface AppErrorOptions {
  category?: ErrorCategory;
  context?: LogContext;
  statusCode?: number;
  errorCode?: string;
  expected?: boolean;
  operation?: string;
}

export class BadRequestError extends Error {
  public category: ErrorCategory;
  public context?: LogContext;
  public statusCode: number;
  public errorCode: string;
  public expected: boolean;
  public operation?: string;

  constructor(
    message: string,
    category: ErrorCategory = 'system',
    context?: LogContext,
    options?: Omit<AppErrorOptions, 'category' | 'context' | 'statusCode'>
  ) {
    super(message);
    this.name = 'BadRequestError';
    this.category = category;
    this.context = context;
    this.statusCode = 400;
    this.errorCode = options?.errorCode || 'BAD_REQUEST';
    this.expected = options?.expected ?? true;
    this.operation = options?.operation;
  }
}

export class ValidationError extends Error {
  public category: ErrorCategory;
  public context?: LogContext;
  public statusCode: number;
  public errorCode: string;
  public expected: boolean;
  public operation?: string;

  constructor(
    message: string,
    category: ErrorCategory = 'system',
    context?: LogContext,
    options?: Omit<AppErrorOptions, 'category' | 'context' | 'statusCode'>
  ) {
    super(message);
    this.name = 'ValidationError';
    this.category = category;
    this.context = context;
    this.statusCode = 400;
    this.errorCode = options?.errorCode || 'VALIDATION_ERROR';
    this.expected = options?.expected ?? true;
    this.operation = options?.operation;
  }
}

export class AuthorizationError extends Error {
  public category: ErrorCategory;
  public context?: LogContext;
  public statusCode: number;
  public errorCode: string;
  public expected: boolean;
  public operation?: string;

  constructor(
    message: string,
    category: ErrorCategory = 'auth',
    context?: LogContext,
    options?: Omit<AppErrorOptions, 'category' | 'context' | 'statusCode'>
  ) {
    super(message);
    this.name = 'AuthorizationError';
    this.category = category;
    this.context = context;
    this.statusCode = 403;
    this.errorCode = options?.errorCode || 'AUTHORIZATION_ERROR';
    this.expected = options?.expected ?? true;
    this.operation = options?.operation;
  }
}
