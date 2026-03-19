import "../globals.css";
import { UserProvider } from "@/hooks/useUser";
import { NavbarProvider } from "@/components/providers/NavbarProvider";
import SessionProvider from "@/components/providers/SessionProvider";
import AuthSync from "@/components/providers/AuthSync";
import PWAProvider from "@/components/providers/PWAProvider";
import TimezoneSync from "@/components/providers/TimezoneSync";
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Metadata } from "next";
import { buildLocaleAlternates, getBaseUrl } from "@/lib/seo";
import { getUserTimeZone } from "@/lib/date-time";
import path from "node:path";
import { readFile } from "node:fs/promises";

async function loadLocaleMessages(locale: string) {
  const fallbackLocale = routing.defaultLocale;
  const resolvedLocale = routing.locales.includes(locale as any) ? locale : fallbackLocale;
  if ((globalThis as any).__tdartsLocaleMessages?.[resolvedLocale]) {
    return (globalThis as any).__tdartsLocaleMessages[resolvedLocale] as Record<string, unknown>;
  }
  const filePath = path.join(process.cwd(), "messages", `${resolvedLocale}.json`);
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (!(globalThis as any).__tdartsLocaleMessages) {
    (globalThis as any).__tdartsLocaleMessages = {};
  }
  (globalThis as any).__tdartsLocaleMessages[resolvedLocale] = parsed;
  return parsed;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const baseUrl = getBaseUrl();
  const localeAlternates = buildLocaleAlternates('/');
  const ogLocale = locale === 'hu' ? 'hu_HU' : locale === 'de' ? 'de_DE' : 'en_US';

  return {
    title: {
      default: t('title'),
      template: "%s | tDarts"
    },
    description: t('description'),
    keywords: t('keywords').split(',').map(k => k.trim()),
    authors: [{ name: t("tdarts_team_wsgu") }],
    creator: "tDarts",
    publisher: "tDarts",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        ...Object.fromEntries(
          Object.entries(localeAlternates).map(([loc, path]) => [loc, `${baseUrl}${path}`])
        ),
        'x-default': `${baseUrl}/hu`,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/tdarts_fav.svg", type: "image/svg+xml" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
      other: [
        {
          rel: "mask-icon",
          url: "/tdarts_fav.svg",
        },
      ],
    },
    manifest: "/site.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: t("tdarts_f0pi"),
    },
    applicationName: "tDarts",
    openGraph: {
      type: "website",
      locale: ogLocale,
      alternateLocale: routing.locales.filter(l => l !== locale).map(l =>
        l === 'hu' ? 'hu_HU' : l === 'de' ? 'de_DE' : 'en_US'
      ),
      url: `${baseUrl}/${locale}`,
      siteName: "tDarts",
      title: t('og_title'),
      description: t('description'),
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: t('og_title'),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t('og_title'),
      description: t('twitter_description'),
      images: [`${baseUrl}/og-image.png`],
      creator: "@tdarts",
    },
    verification: {
      google: process.env.GOOGLE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  const messages = await loadLocaleMessages(locale);
  const userTimeZone = getUserTimeZone();

  return (
    <html lang={locale} className="dark">
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#373d42" />
        <meta name="google-site-verification" content="0fadL9zSu0Oc0kyt3hnRa_S1jEOTUVQp4PaHLJm7JF4" />

      </head>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider messages={messages} timeZone={userTimeZone}>
          <SessionProvider>
            <UserProvider initialUser={undefined}>
              <AuthSync />
              <TimezoneSync />
              <PWAProvider />
              <NavbarProvider>
              
                <Toaster position="top-left" />
                {children}
              </NavbarProvider>
            </UserProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}