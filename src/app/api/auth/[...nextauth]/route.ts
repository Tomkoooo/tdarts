import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withApiTelemetry } from '@/lib/api-telemetry';

const handler = withApiTelemetry('/api/auth/[...nextauth]', NextAuth(authOptions) as any);

export { handler as GET, handler as POST };
