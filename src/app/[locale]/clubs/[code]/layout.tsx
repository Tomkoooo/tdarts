import React, { ReactNode } from "react";
import { Metadata } from "next";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { ClubService } from "@/database/services/club.service";
import "./layout.css";
import { buildLocaleAlternates, getBaseUrl, type SupportedLocale } from "@/lib/seo";
import { ogImageDimensionsForPath, pickClubOgImagePath, toAbsoluteImageUrl } from "@/lib/og-image";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ code: string }>;
}

const getClubMetadataThemeCached = cache(
  unstable_cache(
    async (clubId: string) => ClubService.getClubMetadataTheme(clubId),
    ["club-metadata-theme"],
    { revalidate: 15 }
  )
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}): Promise<Metadata> {
  const { code, locale } = await params;
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const uiLocale: SupportedLocale = locale === "en" || locale === "de" ? locale : "hu";
  const tSeo = await getTranslations({ locale: uiLocale, namespace: "Club.seo" });
  const clubPath = `/clubs/${code}`;
  const localeAlternates = buildLocaleAlternates(clubPath);
  const ogLocale = locale === 'hu' ? 'hu_HU' : locale === 'de' ? 'de_DE' : 'en_US';

  try {
    const club = await getClubMetadataThemeCached(code);
    
    const name = club.name || "Darts Klub";
    const primaryTitle = club.landingPage?.seo?.title || name;
    const brandSuffix = "tDarts";
    const pageTitle = `${primaryTitle} | ${brandSuffix}`;
    const place = club.location || club.address;
    const description =
      club.landingPage?.seo?.description ||
      club.description ||
      (place
        ? tSeo("description_fallback_with_place", { clubName: name, place })
        : tSeo("description_fallback", { clubName: name }));
    const commonKeywords = [name, club.location, "darts", "tDarts", "tornák", "klub"].filter(Boolean);
    const keywords = club.landingPage?.seo?.keywords || commonKeywords.join(', ');
    
    const imagePath = pickClubOgImagePath(club);
    const imageUrl = toAbsoluteImageUrl(imagePath, baseUrl);
    const { width: ogW, height: ogH } = ogImageDimensionsForPath(imagePath);

    const location = club.address || club.location || "Magyarország";
    const canonicalUrl = `${baseUrl}/${locale}${clubPath}`;
    const memberCount = club.membersCount || 0;

    return {
      title: pageTitle,
      description,
      keywords,
      metadataBase: new URL(baseUrl),
      alternates: {
        canonical: canonicalUrl,
        languages: {
          ...Object.fromEntries(
            Object.entries(localeAlternates).map(([loc, path]) => [loc, `${baseUrl}${path}`])
          ),
          'x-default': `${baseUrl}/hu${clubPath}`,
        },
      },
      openGraph: {
        title: pageTitle,
        description,
        url: canonicalUrl,
        type: "website",
        images: [
          {
            url: imageUrl,
            width: ogW,
            height: ogH,
            alt: primaryTitle,
          },
        ],
        siteName: "tDarts",
        locale: ogLocale,
      },
      twitter: {
        card: "summary_large_image",
        title: pageTitle,
        description,
        images: [imageUrl],
      },
      other: {
        "og:type": "website",
        "og:site_name": "tDarts",
        "og:locale": ogLocale,
        "og:location": location,
        "og:club:name": name,
        "og:club:member_count": memberCount.toString(),
        "og:club:code": code,
      },
    };
  } catch (e) {
    console.error(e);
    const fallbackTitleByLocale: Record<string, string> = {
      hu: "Klub nem található",
      en: "Club not found",
      de: "Club nicht gefunden",
    };
    return {
      title: fallbackTitleByLocale[locale] || fallbackTitleByLocale.en,
    };
  }
}

export default async function ClubLayout({ children, params }: LayoutProps) {
    const { code } = await params;
    let club;
    try {
        club = await getClubMetadataThemeCached(code);
    } catch {
        // Handle error or let page handle it
    }

    const primaryColor = club?.landingPage?.primaryColor || '#000000';
    const secondaryColor = club?.landingPage?.secondaryColor || '#ffffff';

    return (
        <div 
          className="min-h-screen"
          style={{
            '--primary-color': primaryColor,
            '--secondary-color': secondaryColor,
          } as React.CSSProperties}
        >
            {children}
        </div>
    );
}
