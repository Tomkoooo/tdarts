import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { AuthService } from "@/database/services/auth.service";
import { UserProvider } from "@/hooks/useUser";

export const metadata: Metadata = {
  title: "tDarts",
  description: "Your ultimate darts tournament management system",
  icons: {
    icon: "/tbase_fav.svg",
    apple: "/tbase_fav.svg",
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
      <body>
        <UserProvider initialUser={initialUser}>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}