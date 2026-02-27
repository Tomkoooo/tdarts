import React, { ReactNode } from "react";
import { Metadata } from "next";
import { TournamentService } from "@/database/services/tournament.service";
import { TournamentDocument } from "@/interface/tournament.interface";
import { ClubDocument } from "@/interface/club.interface";
import { buildLocaleAlternates, getBaseUrl } from "@/lib/seo";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ code: string }>;
}

// Helper to build absolute URL for images
function getAbsoluteUrl(path: string, base: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${base}${path}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}): Promise<Metadata> {
  let tournament: TournamentDocument | null = null;
  const { code, locale } = await params;
  const baseUrl = getBaseUrl();
  const tournamentPath = `/tournaments/${code}`;
  const localeAlternates = buildLocaleAlternates(tournamentPath);
  const ogLocale = locale === 'hu' ? 'hu_HU' : locale === 'de' ? 'de_DE' : 'en_US';

  try {
    tournament = await TournamentService.getTournament(code);
  } catch (e) {
    console.error(e);
    return {};
  }
  if (!tournament) return {};

  const club = tournament.clubId as unknown as ClubDocument | undefined;
  const t = tournament.tournamentSettings || {};
  const name = t.name || "Darts Verseny";
  const description =
    t.description ||
    `Részletek a(z) ${name} darts versenyről. Szervező: ${club?.name || ""}.`;
  
  const image = t.coverImage || club?.logo || "/images/tournament-default-cover.jpg";
  const imageUrl = getAbsoluteUrl(image, baseUrl);

  const startDate = t.startDate ? new Date(t.startDate).toISOString() : undefined;
  const endDate = t.endDate ? new Date(t.endDate).toISOString() : undefined;
  const location = club?.address || club?.location || "Magyarország";
  const canonicalUrl = `${baseUrl}/${locale}${tournamentPath}`;

  return {
    title: `${name} | Darts Verseny`,
    description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...Object.fromEntries(
          Object.entries(localeAlternates).map(([loc, path]) => [loc, `${baseUrl}${path}`])
        ),
        'x-default': `${baseUrl}/hu${tournamentPath}`,
      },
    },
    openGraph: {
      title: name,
      description,
      url: canonicalUrl,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
      siteName: "tDarts",
      locale: ogLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: [imageUrl],
    },
    other: {
      "og:type": "website",
      "og:site_name": "tDarts",
      "og:locale": ogLocale,
      ...(startDate && { "og:start_date": startDate }),
      ...(endDate && { "og:end_date": endDate }),
      "og:location": location,
      "og:club": club?.name || "",
      "og:tournament:code": code,
    },
  };
}

export default function TournamentLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
