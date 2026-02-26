import React, { ReactNode } from "react";
import { Metadata } from "next";
import { ClubService } from "@/database/services/club.service";
import { getBaseUrl } from "@/lib/seo";
import { buildClubMetadataValues } from "@/lib/clubSeo";
import "./layout.css";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  try {
    const club = await ClubService.getClub(code);
    
    const { name, title, description, keywords, imageUrl, location, canonicalUrl, memberCount } =
      buildClubMetadataValues({ ...club, code });

    return {
      title: {
        default: title,
        template: `%s | ${title}`
      },
      description,
      keywords,
      alternates: {
        canonical: canonicalUrl,
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
        siteName: "Darts Club",
        locale: "hu_HU",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
      metadataBase: new URL(getBaseUrl()),
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
  } catch (e) {
    console.error(e);
    return {
      title: 'Club Not Found',
      description: 'A keresett kluboldal nem található.',
      robots: {
        index: false,
        follow: false,
      },
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
