import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

/** Parse satu nilai .env: dukung tanda kutip dan komentar inline. */
function parseEnvValue(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  // Buang komentar inline pada nilai tanpa tanda kutip: KEY=value # komentar
  const commentIndex = value.search(/\s#/);
  return (commentIndex >= 0 ? value.slice(0, commentIndex) : value).trim();
}

// Ensure DATABASE_URL is loaded even if environment variables weren't passed to process at startup
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const m = trimmed.match(
          /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/
        );
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = parseEnvValue(m[2] ?? "");
        }
      }
    }
  } catch {
    // ignore
  }
}

function getOptimizedDatabaseUrl(): string | undefined {
  const original = process.env.DATABASE_URL;
  if (!original) return undefined;

  try {
    let url = original;
    // If connecting to Supabase pooler, use port 6543 (Transaction mode) instead of 5432 (Session mode)
    // to prevent EMAXCONNSESSION (pool_size: 15 limit) on serverless platforms like Vercel.
    if (url.includes("pooler.supabase.com:5432")) {
      url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
    }

    if (url.includes("pooler.supabase.com")) {
      const parsed = new URL(url);
      parsed.searchParams.set("pgbouncer", "true");
      parsed.searchParams.set("sslmode", "require");
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "1");
      }
      return parsed.toString();
    }

    return url;
  } catch {
    return original;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const optimizedDbUrl = getOptimizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: optimizedDbUrl
      ? {
          db: {
            url: optimizedDbUrl,
          },
        }
      : undefined,
  });

// Always reuse prisma instance across function invocations in serverless environments
globalForPrisma.prisma = prisma;
