import type { Metadata } from "next";
import "./globals.css";
import { cookies, headers } from "next/headers";
import { AuthService } from "@/database/services/auth.service";
import { UserProvider } from "@/hooks/useUser";
import { NavbarProvider } from "@/components/providers/NavbarProvider";
import SessionProvider from "@/components/providers/SessionProvider";
import AuthSync from "@/components/providers/AuthSync";
import PWAProvider from "@/components/providers/PWAProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {  Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: {
    default: "tDarts - Darts Tournament Levezető Rendszer",
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://tdarts.hu"),
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
    other: [
      {
        rel: "mask-icon",
        url: "/tdarts_fav.svg",
      },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "tDarts",
  },
  applicationName: "tDarts",
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
  // Get pathname from headers for initial body padding (server-side)
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Define paths where you don't want to render certain elements
  const hideNavbarPaths = ['/board', '/test', '/tv'];
  const shouldHideNavbar = hideNavbarPaths.some(path => pathname.includes(path));

  
  const cookieStore = cookies();
  const token = (await cookieStore).get("token")?.value;
  let initialUser = undefined;

  // Először próbáljuk meg a JWT token-t
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
      console.log("Layout - JWT user found:", initialUser._id);
    } catch (error) {
      console.error("JWT verification error:", error);
      // Ha a JWT token érvénytelen, töröljük a cookie-t
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        cookieStore.delete('token');
        console.log("Layout - Invalid JWT token deleted");
      } catch (deleteError) {
        console.error("Error deleting invalid JWT token:", deleteError);
      }
    }
  }

  // Csak akkor ellenőrizzük a NextAuth session-t, ha nincs érvényes JWT token
  if (!initialUser) {
    try {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        console.log("Layout - NextAuth session found:", session.user);
        // Ha van NextAuth session, de nincs JWT token, akkor generáljunk egyet
        try {
          const { connectMongo } = await import('@/lib/mongoose');
          const { UserModel } = await import('@/database/models/user.model');
          await connectMongo();
          
          const user = await UserModel.findOne({ 
            email: session.user.email
          });
          
          if (user) {
            // Csak akkor generáljunk JWT token-t, ha nincs már érvényes
            const existingToken = (await cookies()).get('token')?.value;
            if (!existingToken) {
              console.log("Layout - NextAuth user found but no JWT token, will be handled by AuthSync component");
            } else {
              console.log("Layout - JWT token already exists, skipping generation");
            }
            
            initialUser = {
              _id: user._id.toString(),
              username: user.username,
              name: user.name,
              email: user.email,
              isVerified: user.isVerified,
              isAdmin: user.isAdmin,
            };
          }
        } catch (error) {
          console.error("Error generating JWT for NextAuth user:", error);
        }
      }
    } catch (error) {
      console.error("NextAuth session error:", error);
    }
  }

  return (
    <html lang="hu" className="dark">
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#373d42" />
        <meta name="google-site-verification" content="0fadL9zSu0Oc0kyt3hnRa_S1jEOTUVQp4PaHLJm7JF4" />

      </head>
      <body className="flex flex-col">
        <SessionProvider>
          <UserProvider initialUser={initialUser}>
            <AuthSync />
            <PWAProvider />
            <NavbarProvider initialShouldHide={shouldHideNavbar}>
             
              <Toaster position="top-left" />
              {children}
            </NavbarProvider>
          </UserProvider>
        </SessionProvider>
      </body>
    </html>
  );
}