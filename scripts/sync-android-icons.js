/**
 * Generates Android launcher icons from the fixed launcher artwork committed
 * in assets/branding/android-launcher.png (derived from "Buat Android App.png").
 *
 * Admin-uploaded logo and public/logo-masjid-solid.png remain as fallbacks only,
 * so APK builds never fail when the branding asset is missing.
 */
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const RES_DIR = path.join(ROOT, "android", "app", "src", "main", "res");
const LAUNCHER_LOGO = path.join(
  ROOT,
  "assets",
  "branding",
  "android-launcher.png",
);
const FALLBACK_LOGO = path.join(ROOT, "public", "logo-masjid-solid.png");

const MIPMAPS = [
  { dir: "mipmap-mdpi", size: 48 },
  { dir: "mipmap-hdpi", size: 72 },
  { dir: "mipmap-xhdpi", size: 96 },
  { dir: "mipmap-xxhdpi", size: 144 },
  { dir: "mipmap-xxxhdpi", size: 192 },
];

function loadLocalEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function readUploadedLogo() {
  loadLocalEnv();
  if (!process.env.DATABASE_URL) return null;

  let prisma;
  try {
    const { PrismaClient } = require("@prisma/client");
    prisma = new PrismaClient();
    const settings = await prisma.mosqueSettings.findFirst({
      select: { logoUrl: true },
    });
    const logoUrl = settings && settings.logoUrl;
    if (!logoUrl) return null;

    const dataUrl = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=\s]+)$/i.exec(
      logoUrl
    );
    if (dataUrl) {
      const buffer = Buffer.from(dataUrl[1].replace(/\s/g, ""), "base64");
      return buffer.length > 0 ? buffer : null;
    }

    if (/^https?:\/\//i.test(logoUrl)) {
      const response = await fetch(logoUrl);
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    }
    return null;
  } catch (error) {
    console.warn(
      "⚠ Tidak dapat membaca logo dari database, memakai logo bawaan:",
      error instanceof Error ? error.message : error
    );
    return null;
  } finally {
    if (prisma) await prisma.$disconnect().catch(() => undefined);
  }
}

async function buildIcons(source) {
  const stats = await sharp(source).stats();
  const hasTransparency = Boolean(
    stats.channels[3] && stats.channels[3].min < 250
  );

  for (const { dir, size } of MIPMAPS) {
    const targetDir = path.join(RES_DIR, dir);
    fs.mkdirSync(targetDir, { recursive: true });

    // Ikon transparan (logo admin) diberi latar solid dan safe-zone agar tidak
    // terpotong mask peluncur. Ikon dengan latar penuh dipakai apa adanya.
    const innerSize = hasTransparency ? Math.round(size * 0.82) : size;
    const emblem = await sharp(source)
      .resize(innerSize, innerSize, { fit: "contain", position: "centre" })
      .png()
      .toBuffer();
    const square = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 14, g: 36, b: 26, alpha: 1 },
      },
    })
      .composite([{ input: emblem, gravity: "centre" }])
      .png()
      .toBuffer();

    const circle = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );
    const round = await sharp(square)
      .composite([{ input: circle, blend: "dest-in" }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(targetDir, "ic_launcher.png"), square);
    fs.writeFileSync(path.join(targetDir, "ic_launcher_round.png"), round);
    console.log(`✓ ${dir}: ic_launcher.png & ic_launcher_round.png (${size}px)`);
  }
}

async function main() {
  if (fs.existsSync(LAUNCHER_LOGO)) {
    console.log("✓ Sumber ikon: aset launcher bawaan (Buat Android App.png)");
    await buildIcons(fs.readFileSync(LAUNCHER_LOGO));
    return;
  }

  const uploaded = await readUploadedLogo();
  if (uploaded) {
    console.log("✓ Sumber ikon: logo yang diunggah di panel admin");
    await buildIcons(uploaded);
    return;
  }

  if (!fs.existsSync(FALLBACK_LOGO)) {
    throw new Error(`Logo bawaan tidak ditemukan: ${FALLBACK_LOGO}`);
  }
  console.log("✓ Sumber ikon: logo bawaan (database tidak tersedia / kosong)");
  await buildIcons(fs.readFileSync(FALLBACK_LOGO));
}

main().catch((error) => {
  console.error("Gagal menyinkronkan ikon Android:", error);
  process.exit(1);
});
