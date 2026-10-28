import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rawEmail = String(credentials.email).toLowerCase().trim();
        const candidateEmail = rawEmail.includes("@")
          ? rawEmail
          : `${rawEmail}@masjidabudzar.com`;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: rawEmail },
              { email: candidateEmail },
            ],
          },
        });

        if (!user || !user.isActive) return null;

        const rawPassword = String(credentials.password);
        let isValid = await bcrypt.compare(rawPassword, user.password);

        // Friendly fallback for mobile keyboard auto-capitalization (e.g. "Admin123" -> "admin123")
        if (!isValid && rawPassword.length > 0) {
          const lowerFirst =
            rawPassword.charAt(0).toLowerCase() + rawPassword.slice(1);
          if (lowerFirst !== rawPassword) {
            isValid = await bcrypt.compare(lowerFirst, user.password);
          }
        }

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "ADMIN";
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "cfMtRhc2e06xjJj4KFbrErYebnhfrvn8NTXdklXuLPQ=",
  trustHost: true,
});
