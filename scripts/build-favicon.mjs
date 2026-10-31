// Builds the favicon and home-screen icons from the hero Memoji cut-out:
// his head, cropped square, on a light circle (so the black hair still reads
// on a dark browser tab).
//
// Usage (sharp is not a project dependency):
//   npm i --no-save sharp
//   node scripts/build-favicon.mjs src/assets/memoji/hero.webp public
import sharp from 'sharp';
import path from 'node:path';

const [, , input, outDir] = process.argv;
/** The head in the 2048 px cut-out: a square from the top of the hair to just under the chin. */
const HEAD = { left: 404, top: 150, size: 1240 };
const SIZES = { 'favicon-48.png': 48, 'favicon-192.png': 192, 'apple-touch-icon.png': 180 };

const S = 512;
const circle = Buffer.from(
  `<svg width="${S}" height="${S}"><defs><radialGradient id="g" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#f2f2f4"/><stop offset="1" stop-color="#c9c9cf"/></radialGradient></defs><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" fill="url(#g)"/></svg>`,
);
const mask = Buffer.from(`<svg width="${S}" height="${S}"><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}"/></svg>`);
const head = await sharp(input)
  .extract({ left: HEAD.left, top: HEAD.top, width: HEAD.size, height: HEAD.size })
  .resize(S, S, { kernel: 'lanczos3' })
  .toBuffer();
const icon = await sharp(circle)
  .composite([{ input: head }, { input: mask, blend: 'dest-in' }])
  .png()
  .toBuffer();

for (const [name, size] of Object.entries(SIZES)) {
  await sharp(icon).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(path.join(outDir, name));
  console.log(path.join(outDir, name), size);
}
