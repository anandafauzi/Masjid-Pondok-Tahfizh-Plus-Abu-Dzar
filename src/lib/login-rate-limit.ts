import { prisma } from "@/lib/prisma";

/** Batas ketat untuk pasangan (user, IP). */
const MAX_ATTEMPTS = 5;
/**
 * Total percobaan per IP sengaja lebih longgar: banyak admin bisa berbagi IP
 * yang sama di belakang NAT/proxy, jadi 5 password salah dari satu pengguna
 * tidak boleh mengunci semua admin tersebut.
 */
const MAX_IP_ATTEMPTS = 20;
const WINDOW_MINUTES = 15;

/**
 * Samakan identifier yang setara: `admin`, `ADMIN`, dan
 * `admin@abudzar.sch.id` harus berbagi satu kuota rate limit agar tidak
 * bisa di-bypass dengan mengganti format email.
 */
export function normalizeLoginIdentifier(identifier: string): string {
  const value = identifier.toLowerCase().trim();
  if (!value) return "";
  const [localPart] = value.split("@");
  return localPart || value;
}

// Header IP hanya boleh dipercaya bila aplikasi benar-benar berada di
// belakang reverse proxy. Vercel mengisi header ini sendiri; deployment
// mandiri harus mengatur TRUST_PROXY=1 jika memang memakai proxy tepercaya.
const TRUST_PROXY_HEADERS =
  process.env.TRUST_PROXY === "1" || process.env.VERCEL === "1";

function cleanIp(value: string | null): string | null {
  const ip = value?.split(",")[0]?.trim() ?? null;
  if (!ip || ip.length > 64) return null;
  return /^[A-Za-z0-9:._-]+$/.test(ip) ? ip : null;
}

function getClientIp(headersOrRequest?: Request | Headers | null): string | null {
  if (!headersOrRequest || !TRUST_PROXY_HEADERS) return null;
  const headers =
    "headers" in headersOrRequest ? headersOrRequest.headers : headersOrRequest;

  // Platform-specific headers first (trusted reverse proxies like Cloudflare/Vercel)
  const cfConnectingIp = cleanIp(headers.get("cf-connecting-ip"));
  if (cfConnectingIp) return cfConnectingIp;

  const realIp = cleanIp(headers.get("x-real-ip"));
  if (realIp) return realIp;

  return cleanIp(headers.get("x-forwarded-for"));
}

export async function isLoginRateLimited(
  email: string,
  headersOrRequest?: Request | Headers | null
): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  const normalizedEmail = normalizeLoginIdentifier(email);
  if (!normalizedEmail) return { limited: false };
  const ip = getClientIp(headersOrRequest);
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  // Blokir kombinasi (username, IP) dengan batas ketat, dan total per IP
  // dengan batas lebih longgar agar admin di belakang NAT/proxy tidak ikut
  // terblokir. Counter global per username sengaja tidak dipakai: 5 password
  // salah dari satu orang bisa mengunci admin bagi semua orang (DoS).
  const [pairCount, ipCount] = await Promise.all([
    prisma.loginAttempt.count({
      where: {
        email: normalizedEmail,
        ipAddress: ip,
        success: false,
        createdAt: { gte: windowStart },
      },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: {
            ipAddress: ip,
            success: false,
            createdAt: { gte: windowStart },
          },
        })
      : Promise.resolve(0),
  ]);

  const pairBlocked = pairCount >= MAX_ATTEMPTS;
  const ipBlocked = ipCount >= MAX_IP_ATTEMPTS;
  if (pairBlocked || ipBlocked) {
    // Estimasikan retry after dari attempt tertua pada counter yang memblokir.
    // Keduanya harus keluar dari window sebelum akses dibuka lagi, jadi ambil
    // waktu tunggu terbesar.
    const [pairOldest, ipOldest] = await Promise.all([
      pairBlocked
        ? prisma.loginAttempt.findFirst({
            where: {
              email: normalizedEmail,
              ipAddress: ip,
              success: false,
              createdAt: { gte: windowStart },
            },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve(null),
      ipBlocked && ip
        ? prisma.loginAttempt.findFirst({
            where: {
              ipAddress: ip,
              success: false,
              createdAt: { gte: windowStart },
            },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve(null),
    ]);

    const oldestRows = [pairOldest, ipOldest].filter(
      (row): row is NonNullable<typeof row> => row !== null
    );
    const retryAfterMs = Math.max(
      0,
      ...oldestRows.map((row) => row.createdAt.getTime() + WINDOW_MINUTES * 60 * 1000 - Date.now())
    );
    if (retryAfterMs > 0) {
      return { limited: true, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
    }
    return { limited: true, retryAfterSeconds: WINDOW_MINUTES * 60 };
  }

  return { limited: false };
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  headersOrRequest?: Request | Headers | null,
  userAgent?: string | null
): Promise<void> {
  try {
    const normalizedEmail = normalizeLoginIdentifier(email);
    if (!normalizedEmail) return;
    const ip = getClientIp(headersOrRequest);
    await prisma.loginAttempt.create({
      data: {
        email: normalizedEmail,
        ipAddress: ip,
        success,
        userAgent: userAgent?.slice(0, 512) ?? null,
      },
    });
  } catch (error) {
    console.error("[LOGIN_RATE_LIMIT] Failed to record attempt:", error);
  }
}
