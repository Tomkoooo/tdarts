import React, { ReactNode } from "react";
import { Metadata } from "next";
import { ClubService } from "@/database/services/club.service";
import "./layout.css";
import { getTranslations } from "next-intl/server";
import { buildLocaleAlternates, getBaseUrl } from "@/lib/seo";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ code: string }>;
}

// Helper to build absolute URL for images
function getAbsoluteUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${process.env.NEXT_PUBLIC_BASE_URL || "https://tdarts.hu"}${path}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}): Promise<Metadata> {
  const { code, locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auto" });
  const baseUrl = getBaseUrl();
  const clubPath = `/clubs/${code}`;
  const localeAlternates = buildLocaleAlternates(clubPath);
  const ogLocale = locale === 'hu' ? 'hu_HU' : locale === 'de' ? 'de_DE' : 'en_US';

  try {
    const club = await ClubService.getClub(code);
    
    const name = club.name || "Darts Klub";
    const title = club.landingPage?.seo?.title || name;
    const description = club.landingPage?.seo?.description || club.description || `Részletek a(z) ${name} darts klubról.`;
    const commonKeywords = [name, club.location, 'darts', 'tornák', 'klub'].filter(Boolean);
    const keywords = club.landingPage?.seo?.keywords || commonKeywords.join(', ');
    
    const image = club.landingPage?.coverImage || club.landingPage?.logo || club.logo || "/images/club-default-cover.jpg";
    const imageUrl = getAbsoluteUrl(image);

    const location = club.address || club.location || "Magyarország";
    const canonicalUrl = `${baseUrl}/${locale}${clubPath}`;
    const memberCount = club.members?.length || 0;

    return {
      title: {
        default: title,
        template: `%s | ${title}`
      },
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
        title,
        description,
        url: canonicalUrl,
        type: "website",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        siteName: "tDarts",
        locale: ogLocale,
      },
      twitter: {
        card: "summary_large_image",
        title,
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
    return {
      title: t("club_not_found_ecjo"),
    };
  }
}

export default async function ClubLayout({ children, params }: LayoutProps) {
    const { code } = await params;
    let club;
    try {
        club = await ClubService.getClub(code);
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
