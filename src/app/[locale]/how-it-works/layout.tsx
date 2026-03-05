import { Metadata } from "next"
import { getTranslations } from "next-intl/server";
import { buildLocaleAlternates, getBaseUrl } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Auto" });
    const baseUrl = getBaseUrl();
    const pagePath = '/how-it-works';
    const localeAlternates = buildLocaleAlternates(pagePath);
    const ogLocale = locale === 'hu' ? 'hu_HU' : locale === 'de' ? 'de_DE' : 'en_US';
    const descriptionByLocale: Record<string, string> = {
        hu: "Naprakész útmutató a tDarts használatához: bejelentkezés, klubkezelés, versenyszervezés, író program és liga pontozás.",
        en: "Up-to-date guide for using tDarts: login, club management, tournament operations, scorer access, and league points.",
        de: "Aktueller Leitfaden zur Nutzung von tDarts: Login, Club-Management, Turnierablauf, Scorer-Zugang und Liga-Punkte."
    };
    const description = descriptionByLocale[locale] || descriptionByLocale.en;

    return {
        title: t("hogyan_mukodik_247b"),
        description,
        metadataBase: new URL(baseUrl),
        alternates: {
            canonical: `${baseUrl}/${locale}${pagePath}`,
            languages: {
                ...Object.fromEntries(
                    Object.entries(localeAlternates).map(([loc, path]) => [loc, `${baseUrl}${path}`])
                ),
                'x-default': `${baseUrl}/hu${pagePath}`,
            },
        },
        openGraph: {
            title: t("hogyan_mukodik_247b"),
            description,
            url: `${baseUrl}/${locale}${pagePath}`,
            siteName: "tDarts",
            locale: ogLocale,
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: t("hogyan_mukodik_247b"),
            description,
        },
    }
}

export default async function HowItWorksLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}