import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function getClientIp(request?: Request | null): string | null {
  if (!request) return null;
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (ip) return ip;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return null;
}

export async function isLoginRateLimited(
  email: string,
  request?: Request | null
): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  const normalizedEmail = email.toLowerCase().trim();
  const ip = getClientIp(request);
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
  request?: Request | null,
  userAgent?: string | null
): Promise<void> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const ip = getClientIp(request);
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
