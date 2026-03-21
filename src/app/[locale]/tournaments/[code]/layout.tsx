import React, { ReactNode } from "react";
import { Metadata } from "next";
import { TournamentService } from "@/database/services/tournament.service";
import { TournamentDocument } from "@/interface/tournament.interface";
import { buildLocaleAlternates, getBaseUrl } from "@/lib/seo";
import {
  type ClubOgLike,
  ogImageDimensionsForPath,
  pickTournamentOgImagePath,
  toAbsoluteImageUrl,
} from "@/lib/og-image";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ code: string }>;
}

function asClubOgLike(clubId: unknown): ClubOgLike | undefined {
  if (clubId && typeof clubId === 'object' && ('logo' in clubId || 'landingPage' in clubId)) {
    return clubId as ClubOgLike;
  }
  return undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}): Promise<Metadata> {
  let tournament: TournamentDocument | null = null;
  const { code, locale } = await params;
  const baseUrl = getBaseUrl().replace(/\/$/, "");
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

  const clubOg = asClubOgLike(tournament.clubId);
  const clubDoc =
    tournament.clubId && typeof tournament.clubId === 'object'
      ? (tournament.clubId as { name?: string; address?: string; location?: string })
      : undefined;
  const t = tournament.tournamentSettings || {};
  const name = t.name || "Darts Verseny";
  const organizerName = clubDoc?.name || "";
  const description =
    t.description ||
    `Részletek a(z) ${name} darts versenyről. Szervező: ${organizerName}.`;

  const imagePath = pickTournamentOgImagePath(t, clubOg);
  const imageUrl = toAbsoluteImageUrl(imagePath, baseUrl);
  const { width: ogW, height: ogH } = ogImageDimensionsForPath(imagePath);

  const startDate = t.startDate ? new Date(t.startDate).toISOString() : undefined;
  const endDate = t.endDate ? new Date(t.endDate).toISOString() : undefined;
  const location = clubDoc?.address || clubDoc?.location || "Magyarország";
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
          width: ogW,
          height: ogH,
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
      "og:club": organizerName,
      "og:tournament:code": code,
    },
  };
}

export default function TournamentLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
