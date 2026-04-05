import { buildAuthRedirectMetadata } from '@/lib/auth-redirect-metadata';
import LoginPageClient from './LoginPageClient';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string; callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  return buildAuthRedirectMetadata({ locale, variant: 'login', searchParams: sp });
}

export default function LoginPage() {
  return <LoginPageClient />;
}
