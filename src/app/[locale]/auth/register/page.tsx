import { buildAuthRedirectMetadata } from '@/lib/auth-redirect-metadata';
import RegisterPageClient from './RegisterPageClient';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string; callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  return buildAuthRedirectMetadata({ locale, variant: 'register', searchParams: sp });
}

export default function RegisterPage() {
  return <RegisterPageClient />;
}
