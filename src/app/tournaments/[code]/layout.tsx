import React, { ReactNode } from "react";
import { Metadata } from "next";
import { TournamentService } from "@/database/services/tournament.service";
import { TournamentDocument } from "@/interface/tournament.interface";
import { ClubDocument } from "@/interface/club.interface";

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
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  // Fetch tournament data from service layer
  let tournament: TournamentDocument | null = null;
  const { code } = await params;
  try {
    tournament = await TournamentService.getTournament(code);
  } catch (e) {
    console.error(e);
    // Tournament not found or error
    return {};
  }
  if (!tournament) return {};

  // Club info - tournament.clubId is populated as ClubDocument
  const club = tournament.clubId as unknown as ClubDocument | undefined;

  // Tournament info
  const t = tournament.tournamentSettings || {};
  const name = t.name || "Darts Verseny";
  const description =
    t.description ||
    `Részletek a(z) ${name} darts versenyről. Szervező: ${club?.name || ""}.`;
  
  // Use tournament cover image, club logo, or default
  const image = t.coverImage || club?.logo || "/images/tournament-default-cover.jpg";
  const imageUrl = getAbsoluteUrl(image);

  // Dates - now we have both startDate and endDate
  const startDate = t.startDate
    ? new Date(t.startDate).toISOString()
    : undefined;
  const endDate = t.endDate
    ? new Date(t.endDate).toISOString()
    : undefined;

  // Location - use club address, location, or default
  const location = club?.address || club?.location || "Magyarország";

  // Canonical URL
  const canonicalUrl = getAbsoluteUrl(`/tournaments/${code}`);

  return {
    title: `${name} | Darts Verseny`,
    description,
    alternates: {
      canonical: canonicalUrl,
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
      siteName: "Darts Club",
      locale: "hu_HU",
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: [imageUrl],
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://tdarts.hu"),
    other: {
      "og:type": "website",
      "og:site_name": "Darts Club",
      "og:locale": "hu_HU",
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
