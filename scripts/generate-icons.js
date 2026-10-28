const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const NAVY = [30, 58, 138];
const GREEN = [16, 185, 129];
const WHITE = [255, 255, 255];

const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

function colorAt(x, y) {
  const isMinaret =
    (inRect(x, y, 112, 190, 140, 392) ||
      inRect(x, y, 372, 190, 400, 392) ||
      (inCircle(x, y, 126, 190, 14) && y <= 190) ||
      (inCircle(x, y, 386, 190, 14) && y <= 190));
  if (isMinaret) return WHITE;

  const isBase = inRect(x, y, 146, 250, 366, 392);
  if (isBase) return WHITE;

  const isDome = (x - 256) ** 2 + (y - 250) ** 2 <= 110 * 110 && y <= 250;
  const isFinial =
    inCircle(x, y, 256, 128, 12) || inRect(x, y, 251, 128, 261, 162);
  if (isDome || isFinial) return WHITE;

  const isDoor =
    inRect(x, y, 226, 310, 286, 392) ||
    (inCircle(x, y, 256, 310, 30) && y <= 310);
  if (isDoor) return GREEN;

  return NAVY;
}

function render(size) {
  const scale = size / 512;
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const [r, g, b] = colorAt(px / scale, py / scale);
      const i = (py * size + px) * 4;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    }
  }
  return encodePng(size, size, pixels);
}

const outDir = path.join(__dirname, "..", "public");
for (const size of [192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, render(size));
  console.log(`wrote ${file}`);
}
