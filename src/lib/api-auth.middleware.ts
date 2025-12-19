import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to validate requests using INTERNAL_API_SECRET
 * Used for public API endpoints that need service-to-service authentication
 */
export function validateInternalSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_API_SECRET || 'development-secret-change-in-production';
  
  return secret === expectedSecret;
}

/**
 * Returns 401 Unauthorized response
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized - Invalid or missing internal secret' },
    { status: 401 }
  );
}
