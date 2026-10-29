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
          : `${rawEmail}@abudzar.sch.id`;

        try {
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: rawEmail },
                { email: candidateEmail },
                { email: `${rawEmail}@abudzar.sch.id` },
                { email: `${rawEmail}@masjidabudzar.com` },
              ],
            },
          });

          if (!user || !user.isActive) {
            console.warn(`[AUTH] Login failed: User '${rawEmail}' not found or inactive.`);
            return null;
          }

          const rawPassword = String(credentials.password);
          let isValid = await bcrypt.compare(rawPassword, user.password);

          // Friendly fallback for mobile keyboard auto-capitalization (e.g. "Masjidabudzar" -> "masjidabudzar")
          if (!isValid && rawPassword.length > 0) {
            const lowerFirst =
              rawPassword.charAt(0).toLowerCase() + rawPassword.slice(1);
            if (lowerFirst !== rawPassword) {
              isValid = await bcrypt.compare(lowerFirst, user.password);
            }
          }

          // Case-insensitive password check fallback
          if (!isValid) {
            isValid = await bcrypt.compare(rawPassword.toLowerCase(), user.password);
          }

          if (!isValid) {
            console.warn(`[AUTH] Login failed: Password mismatch for '${rawEmail}'.`);
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("[AUTH] Database error during authorize:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 365 * 24 * 60 * 60, // Sesi login bertahan 365 hari (1 tahun penuh)
    updateAge: 24 * 60 * 60, // Perbarui usia token setiap 24 jam
  },
  jwt: {
    maxAge: 365 * 24 * 60 * 60, // Token JWT berlaku 365 hari
  },
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
