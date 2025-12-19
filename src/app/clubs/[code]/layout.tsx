import React, { ReactNode } from "react";
import { Metadata } from "next";
import { ClubService } from "@/database/services/club.service";
import { ClubDocument } from "@/interface/club.interface";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ code: string }>;
}

// Helper to build absolute URL for images
function getAbsoluteUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${process.env.NEXT_PUBLIC_BASE_URL || "https://tdarts.sironic.hu"}${path}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  // Fetch club data from service layer
  const { code } = await params;
  let club: ClubDocument | null = null;
  try {
    club = await ClubService.getClub(code);
  } catch (e) {
    // Club not found or error
    console.error(e);
    return {};
  }
  if (!club) return {};

  // Club info
  const name = club.name || "Darts Klub";
  const description = club.description || `Részletek a(z) ${name} darts klubról.`;
  
  // Use club logo or default image
  const image = club.logo || "/images/club-default-cover.jpg";
  const imageUrl = getAbsoluteUrl(image);

  // Location - use address or location
  const location = club.address || club.location || "Magyarország";

  // Canonical URL
  const canonicalUrl = getAbsoluteUrl(`/clubs/${code}`);

  // Get club statistics
  const memberCount = club.members?.length || 0;

  return {
    title: `${name} | Darts Klub`,
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
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://tdarts.sironic.hu"),
    other: {
      "og:type": "website",
      "og:site_name": "Darts Club",
      "og:locale": "hu_HU",
      "og:location": location,
      "og:club:name": name,
      "og:club:member_count": memberCount.toString(),
      "og:club:code": code,
    },
  };
}

export default function ClubLayout({ children }: LayoutProps) {
  return <div className="min-h-screen">{children}</div>;
}
