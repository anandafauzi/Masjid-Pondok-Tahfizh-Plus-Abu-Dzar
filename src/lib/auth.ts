import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/login-rate-limit";

export class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

/** Bedakan kegagalan penyimpanan login dari password salah. */
export class AuthStoreError extends CredentialsSignin {
  code = "auth_store_error";
}

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

        const reqHeaders = await headers().catch(() => null);
        const userAgent = reqHeaders?.get("user-agent") ?? null;

        // 1. Cek rate limiting sebelum query kredensial
        const rateLimit = await isLoginRateLimited(rawEmail, reqHeaders);
        if (rateLimit.limited) {
          console.warn(`[AUTH] Login blocked: Rate limit exceeded for '${rawEmail}'.`);
          throw new RateLimitedError();
        }

        let user;
        try {
          user = await prisma.user.findFirst({
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
        } catch (error) {
          console.error("[AUTH][METRIC] auth_store_error (user lookup):", error);
          throw new AuthStoreError();
        }

        if (!user || !user.isActive) {
          console.warn(`[AUTH] Login failed: User '${rawEmail}' not found or inactive.`);
          await recordLoginAttempt(rawEmail, false, reqHeaders, userAgent);
          return null;
        }

        const rawPassword = String(credentials.password);
        let isValid: boolean;
        try {
          isValid = await bcrypt.compare(rawPassword, user.password);
        } catch (error) {
          console.error("[AUTH][METRIC] auth_store_error (password verify):", error);
          throw new AuthStoreError();
        }

        if (!isValid) {
          console.warn(`[AUTH] Login failed: Password mismatch for '${rawEmail}'.`);
          await recordLoginAttempt(rawEmail, false, reqHeaders, userAgent);
          return null;
        }

        // Catat percobaan berhasil
        await recordLoginAttempt(rawEmail, true, reqHeaders, userAgent);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
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
