import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
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

function getClientIp(headersOrRequest?: Request | Headers | null): string | null {
  if (!headersOrRequest) return null;
  const headers =
    "headers" in headersOrRequest ? headersOrRequest.headers : headersOrRequest;

  // Platform-specific headers first (trusted reverse proxies like Cloudflare/Vercel)
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

export async function isLoginRateLimited(
  email: string,
  headersOrRequest?: Request | Headers | null
): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  const normalizedEmail = normalizeLoginIdentifier(email);
  if (!normalizedEmail) return { limited: false };
  const ip = getClientIp(headersOrRequest);
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const [emailCount, ipCount] = await Promise.all([
    prisma.loginAttempt.count({
      where: {
        email: normalizedEmail,
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

  if (emailCount >= MAX_ATTEMPTS || ipCount >= MAX_ATTEMPTS) {
    // Estimate retry after based on oldest attempt in window. Susun kondisi
    // secara eksplisit: `{}` tidak boleh masuk ke OR karena akan cocok dengan
    // baris apa pun dan menghasilkan waktu tunggu yang salah.
    const conditions: Array<{
      email?: string;
      ipAddress?: string;
      success: boolean;
      createdAt: { gte: Date };
    }> = [
      {
        email: normalizedEmail,
        success: false,
        createdAt: { gte: windowStart },
      },
    ];
    if (ip) {
      conditions.push({
        ipAddress: ip,
        success: false,
        createdAt: { gte: windowStart },
      });
    }

    const oldest = await prisma.loginAttempt.findFirst({
      where: { OR: conditions },
      orderBy: { createdAt: "asc" },
    });
    if (oldest) {
      const retryAfterMs = oldest.createdAt.getTime() + WINDOW_MINUTES * 60 * 1000 - Date.now();
      if (retryAfterMs > 0) {
        return { limited: true, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
      }
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
