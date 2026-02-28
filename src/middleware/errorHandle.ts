import { ErrorService, LogContext } from '@/database/services/error.service';
import { sendEmail } from '@/lib/mailer';
import { NextRequest } from 'next/server';

const CRITICAL_RECIPIENTS = [
  'toth.tamas@sironic.hu',
  'skoda.david@sironic.hu',
];

const CRITICAL_PATTERNS = ['invalid token', 'foglalt user', 'foglal user', 'hibás adatok', 'hibas adatok'];
const CRITICAL_TOURNAMENT_PATTERN = 'tournament not found';
type ErrorCategory = 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database';

interface AppErrorOptions {
  category?: ErrorCategory;
  context?: LogContext;
  statusCode?: number;
  errorCode?: string;
  expected?: boolean;
  operation?: string;
}

function shouldNotifyCriticalError(
  message: string,
  category: ErrorCategory,
  expected?: boolean
) {
  // Expected user-flow errors are intentionally logged,
  // but should not trigger critical notifications.
  if (expected) return false;

  const normalizedMessage = message.toLowerCase();

  if (category !== 'auth' && CRITICAL_PATTERNS.some((pattern) => normalizedMessage.includes(pattern))) {
    return true;
  }

  if (category !== 'tournament' && normalizedMessage.includes(CRITICAL_TOURNAMENT_PATTERN)) {
    return true;
  }

  return false;
}

async function notifyCriticalError(
  message: string,
  category: ErrorCategory,
  context?: LogContext
) {
  try {
    await sendEmail({
      to: CRITICAL_RECIPIENTS,
      subject: `[tDarts] Kritikus hiba - ${category}`,
      text: [
        `Hibaüzenet: ${message}`,
        `Kategória: ${category}`,
        context ? `Kontekstus: ${JSON.stringify(context, null, 2)}` : null,
        `Időpont: ${new Date().toISOString()}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
  } catch (emailError) {
    console.error('Failed to send critical error email', emailError);
  }
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
    this.category = options?.category || category;
    this.context = options?.context || context;
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
    this.category = options?.category || category;
    this.context = options?.context || context;
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
    this.category = options?.category || category;
    this.context = options?.context || context;
    this.statusCode = 403;
    this.errorCode = options?.errorCode || 'AUTHORIZATION_ERROR';
    this.expected = options?.expected ?? true;
    this.operation = options?.operation;
  }
}

export function getRequestLogContext(request: NextRequest, extra?: LogContext): LogContext {
  const requestId = request.headers.get('x-request-id') || undefined;
  const forwardedFor = request.headers.get('x-forwarded-for') || undefined;
  const realIp = request.headers.get('x-real-ip') || undefined;
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp;

  return {
    endpoint: request.nextUrl.pathname,
    method: request.method,
    ip,
    userAgent: request.headers.get('user-agent') || undefined,
    requestId,
    ...extra,
  };
}

export function handleError(error: unknown, context?: LogContext): { status: number; body: { error: string } } {
  if (error instanceof BadRequestError) {
    const mergedContext: LogContext = {
      ...context,
      ...error.context,
      errorType: error.expected ? 'expected_user_error' : error.name,
      errorCode: error.errorCode,
      expected: error.expected,
      operation: error.operation,
      httpStatus: error.statusCode,
    };

    ErrorService.logError(error.message, error, error.category, mergedContext).catch(console.error);
    if (shouldNotifyCriticalError(error.message, error.category, error.expected)) {
      notifyCriticalError(error.message, error.category, mergedContext).catch(console.error);
    }

    return { status: error.statusCode, body: { error: error.message } };
  }
  
  if (error instanceof ValidationError) {
    const mergedContext: LogContext = {
      ...context,
      ...error.context,
      errorType: error.expected ? 'expected_user_error' : error.name,
      errorCode: error.errorCode,
      expected: error.expected,
      operation: error.operation,
      httpStatus: error.statusCode,
    };

    ErrorService.logError(error.message, error, error.category, mergedContext).catch(console.error);
    if (shouldNotifyCriticalError(error.message, error.category, error.expected)) {
      notifyCriticalError(error.message, error.category, mergedContext).catch(console.error);
    }

    return { status: error.statusCode, body: { error: error.message } };
  }
  
  if (error instanceof AuthorizationError) {
    const mergedContext: LogContext = {
      ...context,
      ...error.context,
      errorType: error.expected ? 'expected_user_error' : error.name,
      errorCode: error.errorCode,
      expected: error.expected,
      operation: error.operation,
      httpStatus: error.statusCode,
    };

    ErrorService.logError(error.message, error, error.category, mergedContext).catch(console.error);
    if (shouldNotifyCriticalError(error.message, error.category, error.expected)) {
      notifyCriticalError(error.message, error.category, mergedContext).catch(console.error);
    }

    return { status: error.statusCode, body: { error: error.message } };
  }
  
  // Log unexpected errors
  if (error instanceof Error) {
    ErrorService.logError('Unexpected error occurred', error, 'system', {
      ...context,
      errorType: error.name || 'unexpected_error',
      errorCode: 'UNEXPECTED_ERROR',
      expected: false,
      httpStatus: 500,
    }).catch(console.error);
  } else {
    ErrorService.logError('Unexpected error occurred', String(error), 'system', {
      ...context,
      errorType: 'unexpected_error',
      errorCode: 'UNEXPECTED_ERROR',
      expected: false,
      httpStatus: 500,
    }).catch(console.error);
  }
  
  console.error('Unexpected error:', error);
  return { status: 500, body: { error: 'Internal server error' } };
}

export function errorHandle(error: unknown, context?: LogContext): { status: number; body: { error: string } } {
  return handleError(error, context);
}