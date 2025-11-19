import { ErrorService, LogContext } from '@/database/services/error.service';
import { sendEmail } from '@/lib/mailer';

const CRITICAL_RECIPIENTS = [
  'toth.tamas@sironic.hu',
  'skoda.david@sironic.hu',
];

const CRITICAL_PATTERNS = ['invalid token', 'foglalt user', 'foglal user', 'hibás adatok', 'hibas adatok'];
const CRITICAL_TOURNAMENT_PATTERN = 'tournament not found';

function shouldNotifyCriticalError(
  message: string,
  category: 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database'
) {
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
  category: 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database',
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
  constructor(
    message: string,
    public category: 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database' = 'system',
    public context?: LogContext
  ) {
    super(message);
    this.name = 'BadRequestError';
    
    // Log the error to database
    ErrorService.logError(message, this, category, context).catch(console.error);
    if (shouldNotifyCriticalError(message, category)) {
      notifyCriticalError(message, category, context).catch(console.error);
    }
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
    if (shouldNotifyCriticalError(message, category)) {
      notifyCriticalError(message, category, context).catch(console.error);
    }
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
    if (shouldNotifyCriticalError(message, category)) {
      notifyCriticalError(message, category, context).catch(console.error);
    }
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