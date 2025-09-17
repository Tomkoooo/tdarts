import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import { connectMongo } from './mongoose';
import { UserModel } from '@/database/models/user.model';

const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = client.connect();

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          await connectMongo();
          
          // Ellenőrizzük, hogy létezik-e már a felhasználó
          const existingUser = await UserModel.findOne({ 
            $or: [
              { email: user.email },
              { googleId: account.providerAccountId }
            ]
          });

          if (!existingUser) {
            // Új felhasználó létrehozása Google adatokkal
            const newUser = await UserModel.create({
              email: user.email!,
              name: user.name || profile?.name || '',
              username: user.email!.split('@')[0], // Email prefix használata username-ként
              googleId: account.providerAccountId,
              isVerified: true, // Google OAuth esetén automatikusan verifikált
              profilePicture: user.image,
              authProvider: 'google'
            });
            
            console.log('Google OAuth user created:', newUser._id);
          } else {
            // Meglévő felhasználó frissítése Google adatokkal
            if (!existingUser.googleId) {
              existingUser.googleId = account.providerAccountId;
              existingUser.isVerified = true;
              if (user.image) {
                existingUser.profilePicture = user.image;
              }
              existingUser.authProvider = 'google';
              await existingUser.save();
              console.log('Google OAuth linked to existing user:', existingUser._id);
            }
          }
          
          return true;
        } catch (error) {
          console.error('Google OAuth sign in error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Csak akkor frissítsük a token-t, ha új bejelentkezés történt
      if (user && account?.provider === 'google') {
        try {
          await connectMongo();
          const dbUser = await UserModel.findOne({ 
            $or: [
              { email: user.email },
              { googleId: account.providerAccountId }
            ]
          });
          
          console.log('JWT callback - Found user:', dbUser ? dbUser._id : 'No user found');
          
          if (dbUser) {
            token.userId = dbUser._id.toString();
            token.isAdmin = dbUser.isAdmin;
            token.isVerified = dbUser.isVerified;
            token.email = dbUser.email;
            token.name = dbUser.name;
            token.username = dbUser.username;
          }
        } catch (error) {
          console.error('JWT callback error:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Csak akkor frissítsük a session-t, ha van token adat
      if (session.user && token.userId) {
        (session.user as any).id = token.userId as string;
        (session.user as any).isAdmin = token.isAdmin as boolean;
        (session.user as any).isVerified = token.isVerified as boolean;
        (session.user as any).email = token.email as string;
        (session.user as any).name = token.name as string;
        (session.user as any).username = token.username as string;
        
        console.log('Session callback - Updated session:', {
          id: (session.user as any).id,
          email: (session.user as any).email,
          name: (session.user as any).name
        });
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Ha Google OAuth callback, akkor a saját route-unkra irányítsunk
      if (url.includes('/api/auth/callback/google')) {
        return `${baseUrl}/api/auth/google-callback`;
      }
      // Ha a főoldalra akarunk menni, akkor oda
      if (url === baseUrl || url === '/') {
        return baseUrl;
      }
      // Egyéb esetekben az eredeti URL-t használjuk
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
