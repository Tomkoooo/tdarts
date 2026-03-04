import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
import { cookies } from 'next/headers';
import { getUserTimeZone } from '@/lib/date-time';

export default getRequestConfig(async ({requestLocale}) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const cookieStore = await cookies();
  const timeZone = cookieStore.get('user-timezone')?.value || getUserTimeZone();

  return {
    locale,
    timeZone,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
