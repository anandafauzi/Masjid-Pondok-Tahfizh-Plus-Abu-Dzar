import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

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
  const normalizedEmail = email.toLowerCase().trim();
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
    // Estimate retry after based on oldest attempt in window
    const oldest = await prisma.loginAttempt.findFirst({
      where: {
        OR: [
          { email: normalizedEmail, success: false, createdAt: { gte: windowStart } },
          ip ? { ipAddress: ip, success: false, createdAt: { gte: windowStart } } : {},
        ],
      },
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
    const normalizedEmail = email.toLowerCase().trim();
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
