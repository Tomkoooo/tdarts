import React, { ReactNode } from "react";
import { Metadata } from "next";
import { ClubService } from "@/database/services/club.service";
import "./layout.css";

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
  const { code } = await params;
  try {
    const club = await ClubService.getClub(code);
    
    // SEO Fields with fallbacks
    const name = club.name || "Darts Klub";
    const title = club.landingPage?.seo?.title || name;
    const description = club.landingPage?.seo?.description || club.description || `Részletek a(z) ${name} darts klubról.`;
    const commonKeywords = [name, club.location, 'darts', 'tornák', 'klub'].filter(Boolean);
    const keywords = club.landingPage?.seo?.keywords || commonKeywords.join(', ');
    
    // Use club logo or default image
    const image = club.landingPage?.coverImage || club.landingPage?.logo || club.logo || "/images/club-default-cover.jpg";
    const imageUrl = getAbsoluteUrl(image);

    // Location - use address or location
    const location = club.address || club.location || "Magyarország";

    // Canonical URL
    const canonicalUrl = getAbsoluteUrl(`/clubs/${code}`);

    // Get club statistics
    const memberCount = club.members?.length || 0;

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
      metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://tdarts.hu"),
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
