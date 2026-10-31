// Turns the background-removed 4K PNGs in source-images/ into the WebP
// images the page uses (src/assets/): scaled down to --width (and --height, cropping
// from the bottom if the aspect differs) with light sharpening. With --crop,
// the images are first trimmed to the figure, all sharing one crop box so
// poses line up when swapped; the crop is printed, for
// src/components/Standee/scenes.ts.
//
// Usage (sharp is not a project dependency):
//   npm i --no-save sharp
//   node scripts/prepare-images.mjs --width=2048 source-images/memoji/hero.png:src/assets/memoji/hero.webp
//   node scripts/prepare-images.mjs --crop --width=840 source-images/memoji/about-idle.png:src/assets/memoji/about-idle.webp source-images/memoji/about-speaking.png:src/assets/memoji/about-speaking.webp
//   node scripts/prepare-images.mjs --crop --width=1600 source-images/memoji/projects-idle.png:src/assets/memoji/projects-idle.webp source-images/memoji/projects-speaking.png:src/assets/memoji/projects-speaking.webp
//   node scripts/prepare-images.mjs --width=1920 --height=1536 source-images/memoji/contact-idle.png:src/assets/memoji/contact-idle.webp source-images/memoji/contact-speaking.png:src/assets/memoji/contact-speaking.webp
//   node scripts/prepare-images.mjs --crop --width=1600 source-images/props/laptop.png:src/assets/props/laptop.webp
import sharp from 'sharp';

const args = process.argv.slice(2);
const crop = args.includes('--crop');
const option = (name) => Number(args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]) || undefined;
const WIDTH = option('width');
const HEIGHT = option('height');
const jobs = args.filter((a) => !a.startsWith('--')).map((a) => a.split(':'));
const PAD = 30;

async function load(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  let box = { left: W, top: H, right: 0, bottom: 0 };
  for (let i = 0; i < W * H; i++) {
    if (data[i * 4 + 3] <= 8) continue;
    const x = i % W, y = (i / W) | 0;
    box = { left: Math.min(box.left, x), top: Math.min(box.top, y), right: Math.max(box.right, x), bottom: Math.max(box.bottom, y) };
  }
  return { data, W, H, box };
}

/** Scales with Lanczos, sharpens the colour only (so the edge gets no halo), keeps the alpha. */
async function write(img, out) {
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
  const w = WIDTH ?? info.width, h = HEIGHT ?? Math.round((info.height * w) / info.width);
  const big = await sharp(data, raw).resize(w, h, { kernel: 'lanczos3', fit: 'cover', position: 'top' }).raw().toBuffer();
  const raw4 = { raw: { width: w, height: h, channels: 4 } };
  // Separate passes: sharp would otherwise apply removeAlpha after joinChannel.
  const alpha = await sharp(big, raw4).extractChannel(3).raw().toBuffer();
  const rgb = await sharp(big, raw4).removeAlpha().sharpen({ sigma: 0.7, m1: 0.6, m2: 2 }).raw().toBuffer();
  await sharp(rgb, { raw: { width: w, height: h, channels: 3 } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .webp({ quality: 90, alphaQuality: 95, smartSubsample: true, effort: 6 })
    .toFile(out);
  return [w, h];
}

const images = await Promise.all(jobs.map(([input]) => load(input)));
const { W, H } = images[0];
const region = crop && {
  left: Math.max(0, Math.min(...images.map((c) => c.box.left)) - PAD),
  top: Math.max(0, Math.min(...images.map((c) => c.box.top)) - PAD),
};
if (region) {
  region.width = Math.min(W - 1, Math.max(...images.map((c) => c.box.right)) + PAD) - region.left + 1;
  region.height = Math.min(H - 1, Math.max(...images.map((c) => c.box.bottom)) + PAD) - region.top + 1;
}

for (const [n, { data, W: w, H: h }] of images.entries()) {
  let img = sharp(data, { raw: { width: w, height: h, channels: 4 } });
  if (region) img = img.extract(region);
  const size = await write(img, jobs[n][1]);
  console.log(jobs[n][1], size.join('x'), region ? { crop: region } : '');
}
