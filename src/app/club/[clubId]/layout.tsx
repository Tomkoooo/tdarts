import type { Metadata } from 'next';
import { ClubService } from '@/database/services/club.service';
import './layout.css';

export interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { clubId } = await params;
  try {
    const club = await ClubService.getClub(clubId);
    return {
      title: club.name,
      description: club.description,
      openGraph: {
        title: club.name,
        description: club.description,
        images: club.landingPage?.coverImage ? [club.landingPage.coverImage] : undefined,
      },
    };
  } catch {
    return {
      title: 'Club Not Found',
    };
  }
}

export default async function ClubLayout({ children, params }: LayoutProps) {
    const { clubId } = await params;
    let club;
    try {
        club = await ClubService.getClub(clubId);
    } catch {
        // Handle error or let page handle it
    }

    const primaryColor = club?.landingPage?.primaryColor || '#000000';
    const secondaryColor = club?.landingPage?.secondaryColor || '#ffffff';

    return (
        <div style={{
            '--primary-color': primaryColor,
            '--secondary-color': secondaryColor,
        } as React.CSSProperties}>
            {/* We could add a Navbar here specific to the club if needed */}
            <main>
                {children}
            </main>
        </div>
    );
}
