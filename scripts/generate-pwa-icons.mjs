import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  const crcValue = crc32(Buffer.concat([typeBuffer, data]));
  crcBuffer.writeUInt32BE(crcValue, 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function clampColor(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function blend(from, to, t) {
  return [
    clampColor(lerp(from[0], to[0], t)),
    clampColor(lerp(from[1], to[1], t)),
    clampColor(lerp(from[2], to[2], t)),
  ];
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    const cx = px - x1;
    const cy = py - y1;
    return Math.sqrt(cx * cx + cy * cy);
  }

  const projection = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  const clamped = Math.max(0, Math.min(1, projection));
  const nx = x1 + clamped * dx;
  const ny = y1 + clamped * dy;
  const cx = px - nx;
  const cy = py - ny;
  return Math.sqrt(cx * cx + cy * cy);
}

function createIcon(size, { maskable = false } = {}) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((size * 4 + 1) * size);
  const topColor = [11, 18, 34];
  const bottomColor = [39, 95, 245];
  const orbColor = [42, 205, 163];
  const highlightColor = [239, 245, 255];
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const maxRadius = size * 0.51;
  const orbRadius = size * (maskable ? 0.22 : 0.27);
  const haloRadius = size * (maskable ? 0.37 : 0.42);
  const tickStroke = Math.max(2.5, size * (maskable ? 0.055 : 0.065));

  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (size * 4 + 1);
    raw[rowOffset] = 0;
    const gradientT = y / Math.max(1, size - 1);
    const rowColor = blend(topColor, bottomColor, gradientT);

    for (let x = 0; x < size; x += 1) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const vignette = Math.min(1, radius / maxRadius);
      let color = blend(rowColor, [7, 12, 24], vignette * 0.24);

      if (radius <= haloRadius) {
        const haloT = 1 - radius / haloRadius;
        color = blend(color, orbColor, haloT * 0.35);
      }

      if (radius <= orbRadius) {
        const orbT = radius / Math.max(1, orbRadius);
        color = blend(orbColor, [31, 126, 225], orbT * 0.7);
      }

      const leftX = size * 0.33;
      const leftY = size * 0.53;
      const midX = size * 0.46;
      const midY = size * 0.66;
      const rightX = size * 0.71;
      const rightY = size * 0.39;
      const d1 = distanceToSegment(x, y, leftX, leftY, midX, midY);
      const d2 = distanceToSegment(x, y, midX, midY, rightX, rightY);
      const tickDistance = Math.min(d1, d2);

      if (tickDistance <= tickStroke && radius <= size * 0.42) {
        const tickT = Math.max(0, 1 - tickDistance / tickStroke);
        color = blend(color, highlightColor, tickT * 0.96);
      }

      raw[pixelOffset] = color[0];
      raw[pixelOffset + 1] = color[1];
      raw[pixelOffset + 2] = color[2];
      raw[pixelOffset + 3] = 255;
    }
  }

  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const files = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-maskable-192.png", size: 192, maskable: true },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
];

for (const file of files) {
  writeFileSync(join(outDir, file.name), createIcon(file.size, { maskable: file.maskable }));
}

console.log(`Generated ${files.length} icons in ${outDir}`);
