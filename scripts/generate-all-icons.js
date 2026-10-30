const path = require('path');
const fs = require('fs');
const sharp = require(path.join(__dirname, '../node_modules/sharp'));
const { createIco } = require('./ico-util');

const sourcePath = 'C:/Users/nanda/.gemini/antigravity/brain/0ab680ce-f5e9-42a6-b07a-9651e7d42079/.user_uploaded/media_1793347492630_e8f554f3.jpg';
const publicDir = path.join(__dirname, '../public');
const appDir = path.join(__dirname, '../src/app');

async function buildAllIcons() {
  console.log('--- Step 1: Reading original uploaded logo ---');
  const source = sharp(sourcePath);
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // 1. Save original high-res as public/logo-masjid-solid.png
  await sharp(sourcePath).png({ quality: 100 }).toFile(path.join(publicDir, 'logo-masjid-solid.png'));
  console.log('✓ Saved public/logo-masjid-solid.png');

  // 2. Create clean transparent version (flood fill outer black)
  console.log('--- Step 2: Extracting clean transparent emblem ---');
  const isOuter = new Uint8Array(width * height);
  const queue = [];
  for (let x = 0; x < width; x++) {
    queue.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y++) {
    queue.push([0, y], [width - 1, y]);
  }

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    const idx = y * width + x;
    if (isOuter[idx]) continue;
    const pidx = idx * channels;
    const r = data[pidx], g = data[pidx+1], b = data[pidx+2];
    const luma = r * 0.299 + g * 0.587 + b * 0.114;
    if (luma < 30) {
      isOuter[idx] = 1;
      if (x > 0 && !isOuter[idx - 1]) queue.push([x - 1, y]);
      if (x < width - 1 && !isOuter[idx + 1]) queue.push([x + 1, y]);
      if (y > 0 && !isOuter[idx - width]) queue.push([x, y - 1]);
      if (y < height - 1 && !isOuter[idx + width]) queue.push([x, y + 1]);
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const s = idx * channels;
      const d = idx * 4;

      if (isOuter[idx]) {
        rgba[d] = 0;
        rgba[d+1] = 0;
        rgba[d+2] = 0;
        rgba[d+3] = 0;
      } else {
        // Boundary anti-aliasing
        let isBoundary = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (isOuter[ny * width + nx]) {
                isBoundary = true;
                break;
              }
            }
          }
          if (isBoundary) break;
        }

        const r = data[s], g = data[s+1], b = data[s+2];
        const luma = r * 0.299 + g * 0.587 + b * 0.114;

        if (isBoundary && luma < 180) {
          const alpha = Math.min(255, Math.max(0, Math.round(luma * 1.5)));
          rgba[d] = 255;
          rgba[d+1] = 255;
          rgba[d+2] = 255;
          rgba[d+3] = alpha;
        } else {
          rgba[d] = r;
          rgba[d+1] = g;
          rgba[d+2] = b;
          rgba[d+3] = 255;
        }
      }
    }
  }

  const transparentBuffer = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  await sharp(transparentBuffer).toFile(path.join(publicDir, 'logo-masjid.png'));
  console.log('✓ Saved public/logo-masjid.png (Transparent)');

  // 3. Generate Favicon (16x16, 32x32, 48x48)
  console.log('--- Step 3: Generating Tab Favicons ---');
  // For favicon, use the transparent emblem with slight padding for crispness
  const fav16 = await sharp(transparentBuffer).resize(16, 16, { fit: 'contain' }).png().toBuffer();
  const fav32 = await sharp(transparentBuffer).resize(32, 32, { fit: 'contain' }).png().toBuffer();
  const fav48 = await sharp(transparentBuffer).resize(48, 48, { fit: 'contain' }).png().toBuffer();

  await sharp(fav16).toFile(path.join(publicDir, 'favicon-16x16.png'));
  await sharp(fav32).toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(fav48).toFile(path.join(publicDir, 'favicon-48x48.png'));

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: fav16 },
    { width: 32, height: 32, buffer: fav32 },
    { width: 48, height: 48, buffer: fav48 },
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  console.log('✓ Saved public/favicon.ico & src/app/favicon.ico');

  // 4. Generate Main PWA Icons (icon-192.png, icon-512.png)
  console.log('--- Step 4: Generating Main PWA Icons ---');
  // For standard "any" icons, we provide the full crisp emblem on solid dark/black background
  await sharp(sourcePath)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'icon-512.png'));

  await sharp(sourcePath)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ Saved public/icon-512.png & icon-192.png');

  // 5. Generate Maskable Icons with Safe Zone (icon-512-maskable.png, icon-192-maskable.png)
  console.log('--- Step 5: Generating Maskable & Apple Touch Icons ---');
  // In maskable, scale emblem down to 76% (390px on 512x512) so Android round/squircle masks don't clip crescents or rehal!
  const emblemScaled512 = await sharp(transparentBuffer)
    .resize(390, 390, { fit: 'contain' })
    .png()
    .toBuffer();

  const maskable512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      {
        input: emblemScaled512,
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();

  await sharp(maskable512).toFile(path.join(publicDir, 'icon-512-maskable.png'));

  await sharp(maskable512)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192-maskable.png'));
  console.log('✓ Saved public/icon-512-maskable.png & icon-192-maskable.png');

  // Apple touch icon (180x180)
  const emblemScaled180 = await sharp(transparentBuffer)
    .resize(140, 140, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: emblemScaled180, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Saved public/apple-touch-icon.png');

  // 6. Generate Admin DKM Icons (Official Emblem + Distinct "ADMIN" badge)
  console.log('--- Step 6: Generating Admin DKM Icons ---');
  // Admin icon uses the official emblem centered, on a deep emerald/pine base with an elegant gold ADMIN badge
  const adminBadgeSvg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="adminGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fae08c" />
          <stop offset="50%" stop-color="#c99a3e" />
          <stop offset="100%" stop-color="#8a6820" />
        </linearGradient>
      </defs>
      <!-- Gold Badge Ribbon at Bottom -->
      <rect x="96" y="420" width="320" height="64" rx="20" fill="#0d241a" stroke="url(#adminGold)" stroke-width="4" />
      <text x="256" y="465" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="url(#adminGold)" text-anchor="middle" letter-spacing="8">ADMIN</text>
    </svg>
  `;

  // Scale emblem for admin to 360px centered slightly higher (y offset) to accommodate badge
  const emblemForAdmin = await sharp(transparentBuffer)
    .resize(360, 360, { fit: 'contain' })
    .png()
    .toBuffer();

  const admin512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 10, g: 26, b: 18, alpha: 1 }, // #0a1a12 deep emerald
    },
  })
    .composite([
      { input: emblemForAdmin, top: 38, left: 76 },
      { input: Buffer.from(adminBadgeSvg), top: 0, left: 0 },
    ])
    .png()
    .toBuffer();

  await sharp(admin512).toFile(path.join(publicDir, 'icon-admin-512.png'));
  await sharp(admin512).toFile(path.join(publicDir, 'icon-admin-512-maskable.png'));

  await sharp(admin512)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-admin-192.png'));
  await sharp(admin512)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-admin-192-maskable.png'));

  console.log('✓ Saved all Admin DKM icons (icon-admin-*)');
  console.log('--- ALL ICONS GENERATED SUCCESSFULLY! ---');
}

buildAllIcons().catch((err) => {
  console.error('Build icons error:', err);
  process.exit(1);
});
