import aboutIdle from '../../assets/memoji/about-idle.webp';
import aboutSpeaking from '../../assets/memoji/about-speaking.webp';
import projectsIdle from '../../assets/memoji/projects-idle.webp';
import projectsSpeaking from '../../assets/memoji/projects-speaking.webp';

/** A box in pixels of the source photo. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Pose {
  src: string;
  /** Eye openings, each with the skin colour just above it (for the eyelid). */
  eyes: (Box & { skin: string })[];
  /** Lip line, where the mouth opens while talking. Only needed on the speaking pose. */
  mouth?: Box;
  /** Hands on a keyboard: this patch of the photo taps up and down while the pose shows. */
  typing?: Box;
}

export interface Scene {
  /** The crop scripts/prepare-images.mjs took from the source images (it prints it). */
  crop: { left: number; top: number; width: number; height: number };
  /** Size of the generated images. */
  size: [number, number];
  quiet: Pose;
  speaking: Pose;
  /** Where the head is across the image, for aiming the balloon's tail. */
  headX: number;
  /** Standing figures shift their weight; seated ones (with furniture) stay put. */
  motion: 'stand' | 'sit';
  alt: string;
}

/**
 * Landmarks are measured on the 5120 px source images in source-images/memoji/
 * (about-*, projects-*). Re-measure them if an image changes.
 */
const aboutEyes = [
  { x: 2370, y: 745, w: 125, h: 60, skin: '#d2ad98' },
  { x: 2620, y: 745, w: 115, h: 60, skin: '#c09c86' },
];

export const aboutScene: Scene = {
  crop: { left: 1689, top: 287, width: 2034, height: 4730 },
  size: [840, 1953],
  quiet: { src: aboutIdle, eyes: aboutEyes },
  speaking: { src: aboutSpeaking, eyes: aboutEyes, mouth: { x: 2485, y: 985, w: 145, h: 30 } },
  headX: 0.42,
  motion: 'stand',
  alt: 'full body: black turtleneck, dark jeans, loafers, hands in pockets',
};

export const deskScene: Scene = {
  crop: { left: 299, top: 256, width: 4604, height: 4864 },
  size: [1600, 1690],
  quiet: {
    src: projectsIdle,
    eyes: [
      { x: 2605, y: 990, w: 115, h: 60, skin: '#b89d90' },
      { x: 2865, y: 990, w: 165, h: 60, skin: '#b3937f' },
    ],
    typing: { x: 2310, y: 2440, w: 700, h: 330 },
  },
  speaking: {
    src: projectsSpeaking,
    eyes: [
      { x: 2730, y: 865, w: 140, h: 80, skin: '#caa793' },
      { x: 3045, y: 860, w: 155, h: 75, skin: '#c1a08c' },
    ],
    mouth: { x: 2885, y: 1145, w: 180, h: 35 },
  },
  headX: 0.578,
  motion: 'sit',
  alt: 'at a wooden desk, typing on a laptop, a coffee mug and notebooks beside it',
};
