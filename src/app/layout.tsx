import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { AuthService } from "@/database/services/auth.service";
import { UserProvider } from "@/hooks/useUser";
import Navbar from "@/components/homapage/Navbar";

export const metadata: Metadata = {
  title: {
    default: "tDarts - Darts Tournament Rendszer",
    template: "%s | tDarts"
  },
  description: "A legjobb darts tournament levezető rendszer. Klubok létrehozása, versenyek szervezése, élő követés és statisztikák.",
  keywords: ["darts", "tournament", "verseny", "klub", "statisztika", "élő követés"],
  authors: [{ name: "tDarts Team" }],
  creator: "tDarts",
  publisher: "tDarts",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://tdarts.sironic.hu"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/tdarts_fav.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
      openGraph: {
      type: "website",
      locale: "hu_HU",
      url: "https://tdarts.sironic.hu",
      siteName: "tDarts",
    title: "tDarts - Darts Tournament Rendszer",
    description: "A legjobb darts tournament levezető rendszer. Klubok létrehozása, versenyek szervezése, élő követés és statisztikák.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "tDarts - Darts Tournament Rendszer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "tDarts - Darts Tournament Rendszer",
    description: "A legjobb darts tournament levezető rendszer",
    images: ["/og-image.png"],
    creator: "@tdarts",
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const token = (await cookieStore).get("token")?.value;
  let initialUser = undefined;

  if (token) {
    try {
      const user = await AuthService.verifyToken(token);
      initialUser = {
        _id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      };
    } catch (error) {
      console.error("JWT verification error:", error);
    }
  }

  return (
    <html lang="hu" data-theme="tDarts" className="dark">
      <head>
        <meta name="color-scheme" content="only dark" />
        <meta name="theme-color" content="#42010b" />
        <meta name="supported-color-schemes" content="dark" />
        <meta name="google-site-verification" content="0fadL9zSu0Oc0kyt3hnRa_S1jEOTUVQp4PaHLJm7JF4" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Force dark mode immediately
              document.documentElement.style.colorScheme = 'dark';
              document.documentElement.style.backgroundColor = '#42010b';
              document.documentElement.style.color = '#ffffff';
              document.body.style.color = '#ffffff';
              // Don't override body background - let CSS handle it
              
              // Also set data attribute
              document.documentElement.setAttribute('data-theme', 'tDarts');
              document.documentElement.classList.add('dark');
              
              // Force CSS custom properties for production
              document.documentElement.style.setProperty('--color-base-100', 'oklch(15% 0.02 12)');
              document.documentElement.style.setProperty('--color-base-200', 'oklch(18% 0.055 18)');
              document.documentElement.style.setProperty('--color-base-300', 'oklch(18% 0.03 12)');
              document.documentElement.style.setProperty('--color-base-content', 'oklch(95% 0.005 0)');
              document.documentElement.style.setProperty('--color-primary', 'oklch(51% 0.18 16)');
              document.documentElement.style.setProperty('--color-primary-content', 'oklch(100% 0 0)');
              document.documentElement.style.setProperty('--color-secondary', 'oklch(18% 0.03 12)');
              document.documentElement.style.setProperty('--color-secondary-content', 'oklch(95% 0.005 0)');
              document.documentElement.style.setProperty('--color-accent', 'oklch(51% 0.18 16)');
              document.documentElement.style.setProperty('--color-accent-content', 'oklch(100% 0 0)');
              document.documentElement.style.setProperty('--color-neutral', 'oklch(15% 0.025 12)');
              document.documentElement.style.setProperty('--color-neutral-content', 'oklch(95% 0.005 0)');
              document.documentElement.style.setProperty('--color-info', 'oklch(70% 0.16 233)');
              document.documentElement.style.setProperty('--color-info-content', 'oklch(100% 0 0)');
              document.documentElement.style.setProperty('--color-success', 'oklch(64% 0.2 132)');
              document.documentElement.style.setProperty('--color-success-content', 'oklch(100% 0 0)');
              document.documentElement.style.setProperty('--color-warning', 'oklch(68% 0.162 76)');
              document.documentElement.style.setProperty('--color-warning-content', 'oklch(100% 0 0)');
              document.documentElement.style.setProperty('--color-error', 'oklch(60% 0.184 16)');
              document.documentElement.style.setProperty('--color-error-content', 'oklch(100% 0 0)');
            `,
          }}
        />
      </head>
      <body className="flex flex-col pt-16 md:pt-20">
        <UserProvider initialUser={initialUser}>
          {/* Navigation */}
          <Navbar />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}