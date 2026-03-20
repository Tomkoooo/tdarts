import { NextRequest, NextResponse } from 'next/server';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { handleGoogleCallbackGet, handleGoogleCallbackPost } from '@/features/auth/lib/googleCallback';

async function __GET(request: NextRequest) {
  try {
    return handleGoogleCallbackGet(request);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=CallbackError', request.url));
  }
}

async function __POST() {
  try {
    return handleGoogleCallbackPost();
  } catch (error: any) {
    console.error('Google OAuth callback POST error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      details: error.message 
    }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/auth/google-callback', __GET as any);
export const POST = withApiTelemetry('/api/auth/google-callback', __POST as any);
