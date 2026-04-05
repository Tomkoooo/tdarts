import { buildAuthRedirectMetadata } from '@/lib/auth-redirect-metadata';
import GoogleCallbackPageClient from './GoogleCallbackPageClient';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string; callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  return buildAuthRedirectMetadata({ locale, variant: 'google', searchParams: sp });
}

export default function GoogleCallbackPage() {
  return <GoogleCallbackPageClient />;
}
