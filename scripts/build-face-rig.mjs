// Builds src/assets/memoji/hero-eyes.png for the 2D face rig: the eye region with
// the irises painted out (so they can be redrawn anywhere) and the eye
// openings in the alpha channel. Landmarks: src/components/Avatar/faceRig.json.
//
// Usage (sharp is not a project dependency):
//   npm i --no-save sharp
//   node scripts/build-face-rig.mjs source-images/memoji/hero.png src/assets/memoji/hero-eyes.png
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const [, , input, output] = process.argv;
const rig = JSON.parse(readFileSync(new URL('../src/components/Avatar/faceRig.json', import.meta.url)));
const { data, info } = await sharp(input).resize(rig.size, rig.size).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const [x0, y0, x1, y1] = rig.eyeBox;
const bw = x1 - x0;
const bh = y1 - y0;

const inside = (poly, x, y) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

// Anti-aliased opening mask (4x4 supersampling).
const mask = new Float32Array(bw * bh);
const polys = Object.values(rig.eyes).map((e) => e.opening);
for (let y = 0; y < bh; y++)
  for (let x = 0; x < bw; x++) {
    let n = 0;
    for (let sy = 0; sy < 4; sy++)
      for (let sx = 0; sx < 4; sx++)
        if (polys.some((p) => inside(p, x0 + x + (sx + 0.5) / 4, y0 + y + (sy + 0.5) / 4))) n++;
    mask[y * bw + x] = n / 16;
  }

const out = Buffer.alloc(bw * bh * 4);
const src = (x, y, c) => data[(y * W + x) * 3 + c];
for (let y = 0; y < bh; y++)
  for (let x = 0; x < bw; x++) for (let c = 0; c < 3; c++) out[(y * bw + x) * 4 + c] = src(x0 + x, y0 + y, c);

// Paint each iris out by interpolating the sclera either side of it, row by row.
const R = rig.irisRadius + 2.5;
const solid = (x, y) => mask[(y - y0) * bw + (x - x0)] > 0.95;
for (const eye of Object.values(rig.eyes)) {
  const [cx, cy] = eye.iris;
  const rows = [];
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
    if (y < y0 || y >= y1) continue;
    const half = Math.sqrt(Math.max(0, R * R - (y - cy) ** 2));
    const xl = Math.floor(cx - half) - 1;
    const xr = Math.ceil(cx + half) + 1;
    const left = solid(xl, y) ? [0, 1, 2].map((c) => src(xl, y, c)) : null;
    const right = solid(xr, y) ? [0, 1, 2].map((c) => src(xr, y, c)) : null;
    rows.push({ y, xl, xr, left, right });
  }
  // Rows where the iris meets a lid have no sclera beside it: borrow the
  // nearest row that does, slightly darker (lids shade the eye white).
  for (const row of rows) {
    for (const side of ['left', 'right']) {
      if (row[side]) continue;
      const near = rows.filter((r) => r[side]).sort((a, b) => Math.abs(a.y - row.y) - Math.abs(b.y - row.y))[0];
      if (!near) continue;
      const shade = Math.max(0.78, 1 - Math.abs(near.y - row.y) * 0.025);
      row[side] = near[side].map((v) => v * shade);
    }
    if (!row.left || !row.right) continue;
    for (let x = row.xl + 1; x < row.xr; x++) {
      if (x < x0 || x >= x1) continue;
      const t = (x - row.xl) / (row.xr - row.xl);
      for (let c = 0; c < 3; c++)
        out[((row.y - y0) * bw + (x - x0)) * 4 + c] = Math.round(row.left[c] * (1 - t) + row.right[c] * t);
    }
  }
}
for (let i = 0; i < bw * bh; i++) out[i * 4 + 3] = Math.round(mask[i] * 255);

await sharp(out, { raw: { width: bw, height: bh, channels: 4 } }).png({ compressionLevel: 9 }).toFile(output);
console.log('wrote', output, `${bw}x${bh}`);
