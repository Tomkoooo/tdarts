import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { AuthService } from "@/database/services/auth.service";
import { UserProvider } from "@/hooks/useUser";
import Navbar from "@/components/homapage/Navbar";

export const metadata: Metadata = {
  title: "tDarts",
  description: "A legjobb darts tournament levezető rendszer",
  icons: {
    icon: "/tdarts_fav.svg",
    apple: "/tdarts_fav.svg",
  },
  openGraph: {
    images: [
      {
        url: "/tdarts_logo.svg",
      },
    ],
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
    <html lang="hu">
      <head>
        <meta name="color-scheme" content="only dark" />
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