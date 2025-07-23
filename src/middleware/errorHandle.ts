export class BadRequestError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BadRequestError';
    }
  }
  
  export function handleError(error: unknown): { status: number; body: { error: string } } {
    if (error instanceof BadRequestError) {
      return { status: 400, body: { error: error.message } };
    }
    console.error('Unexpected error:', error);
    return { status: 500, body: { error: 'Internal server error' } };
  }

  export function errorHandle(error: unknown): { status: number; body: { error: string } } {
    if (error instanceof BadRequestError) {
      return { status: 400, body: { error: error.message } };
    }
    console.error('Unexpected error:', error);
    return { status: 500, body: { error: 'Internal server error' } };
  }