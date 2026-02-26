import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { DEMO_USER, isDemoMode } from "./mock-data";

function getAdapter() {
  if (isDemoMode()) return undefined;
  // Dynamic require to avoid loading Prisma when in demo mode
  const { PrismaAdapter } = require("@auth/prisma-adapter");
  const { prisma } = require("@tradeos/db");
  return PrismaAdapter(prisma);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: getAdapter(),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Demo mode: accept any credentials
        if (isDemoMode()) {
          return {
            id: DEMO_USER.id,
            email: DEMO_USER.email,
            name: DEMO_USER.name,
            image: DEMO_USER.image,
          };
        }

        const { prisma } = await import("@tradeos/db");

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      // Demo mode: return demo user info
      if (isDemoMode()) {
        token.tier = DEMO_USER.tier;
        token.onboardingCompleted = DEMO_USER.onboardingCompleted;
        token.name = DEMO_USER.name;
        token.picture = DEMO_USER.image;
        return token;
      }

      if (token.id) {
        try {
          const { prisma } = await import("@tradeos/db");
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              tier: true,
              onboardingCompleted: true,
              name: true,
              image: true,
            },
          });
          if (dbUser) {
            token.tier = dbUser.tier;
            token.onboardingCompleted = dbUser.onboardingCompleted;
            token.name = dbUser.name;
            token.picture = dbUser.image;
          }
        } catch {
          // DB not available
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).tier = token.tier;
        (session.user as any).onboardingCompleted = token.onboardingCompleted;
      }
      return session;
    },
  },
});
