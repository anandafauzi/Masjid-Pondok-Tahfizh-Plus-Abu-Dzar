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
            orderBy: { createdAt: "asc" },
          });

          if (!user || !user.isActive) {
            console.warn(`[AUTH] Login failed: User '${rawEmail}' not found or inactive.`);
            return null;
          }

          const rawPassword = String(credentials.password);
          const isValid = await bcrypt.compare(rawPassword, user.password);

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
    maxAge: 7 * 24 * 60 * 60, // Sesi login berlaku 7 hari
    updateAge: 24 * 60 * 60, // Perbarui usia token setiap 24 jam
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // Token JWT berlaku 7 hari
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
  // Jangan pernah memakai secret hardcoded. Jika kosong, Auth.js akan mencoba
  // AUTH_SECRET; bila keduanya kosong, request ditolak dengan MissingSecret.
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});
