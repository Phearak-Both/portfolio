import { useLayoutEffect, useState, type RefObject } from 'react';
import contactIdle from '../assets/memoji/contact-idle.webp';
import contactSpeaking from '../assets/memoji/contact-speaking.webp';
import { Face } from '../components/Face/Face';
import { SpeechBubble } from '../components/SpeechBubble/SpeechBubble';
import { site } from '../config/site';
import styles from './Contact.module.css';

/** The coordinate space of the landmarks below: the contact images at 600×480 (the 4K sources are 9.6× that). */
const PHOTO: [number, number] = [600, 480];
/**
 * The laptop lid's outer corners in the images (black bezel included; the
 * same in both poses): top-left, top-right, bottom-right, bottom-left. The
 * page draws the whole lid face, bezel and all, so its edge is one clean line.
 */
const SCREEN: [number, number][] = [
  [295, 110],
  [501, 139],
  [484, 309],
  [282, 269],
];
/** The whole image is shown. */
const FRAME = { left: 0, top: 0, width: PHOTO[0], height: PHOTO[1] };
/** Face landmarks on the speaking pose, for blinking and talking (measured on source-images/memoji/contact-speaking.png at 600×480). */
const FACE = {
  eyes: [
    { x: 168, y: 142, w: 25, h: 10, skin: '#caa88e' },
    { x: 216, y: 139, w: 18, h: 9, skin: '#c6a38f' },
  ],
  mouth: { x: 197, y: 191, w: 23, h: 4, tilt: -6 },
};
/** On large screens the scene is drawn at this share of the space it could fill. */
const SIZE = 1;
/**
 * And raised by this share of the visible height: the image has empty space
 * above his head and its bottom fades out, so true centring looks low.
 */
const LIFT = 0.08;
/** Empty rows above his head in the images, which may slide up under the nav padding. */
const EMPTY_TOP = 30;
/** Where the balloon's tail points: just off his head, once he has turned round. */
const HEAD: [number, number] = [244, 70];
/** The tail's tip, as a fraction of the balloon's width from its left. */
const TAIL_TIP = 0.18;
/** The screen's content is laid out at this size, then warped onto the corners. */
const UI: [number, number] = [400, 300];
/** Below this many pixels of screen width, the screen shows a compact layout with bigger links. */
const COMPACT_BELOW = 260;
/** The compact layout is laid out smaller, so it comes out larger once warped onto the screen. */
const UI_COMPACT: [number, number] = [200, 150];
/** At this width and below, the scene is as tall as the photo instead of the whole viewport. */
const NARROW = '(max-width: 760px)';

const labels: Record<keyof typeof site.contact, string> = {
  email: 'Email',
  github: 'GitHub',
  linkedin: 'LinkedIn',
};

interface Layout {
  scale: number;
  x: number;
  y: number;
  /** Set on narrow screens, where the scene takes the photo's height. */
  height?: number;
}

/**
 * Fits the whole photo inside the scene's padding box (clear of the nav),
 * centred in the part of the screen the chat dock leaves visible. On narrow
 * screens it spans the width instead and the scene takes its height.
 */
function fit(el: HTMLElement): Layout {
  const cs = getComputedStyle(el);
  const [top, right, bottom, left] = ['top', 'right', 'bottom', 'left'].map((side) =>
    parseFloat(cs.getPropertyValue(`padding-${side}`)),
  );
  const w = el.clientWidth - left - right;
  if (window.matchMedia(NARROW).matches) {
    const scale = w / PHOTO[0];
    return { scale, x: left, y: top, height: top + PHOTO[1] * scale + bottom };
  }
  const h = el.clientHeight - top - bottom;
  const scale = Math.min(w / PHOTO[0], h / PHOTO[1]) * SIZE;
  // The dock floats over the bottom of the scene, so centre above it.
  const visible = el.clientHeight - top - (parseFloat(cs.getPropertyValue('--dock-h')) || 0);
  return {
    scale,
    x: left + (w - PHOTO[0] * scale) / 2,
    y: Math.max(top - EMPTY_TOP * scale, top + (visible - PHOTO[1] * scale) / 2 - visible * LIFT),
  };
}

/** CSS matrix3d that warps a w×h box onto a quadrilateral (corners clockwise from top-left). */
function warp([w, h]: [number, number], [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]: [number, number][]) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const k = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3;
  const d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
  return `matrix3d(${[a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1].join(',')})`;
}

interface ContactProps {
  /** The scene, for the page to tell when it's on screen. */
  ref: RefObject<HTMLElement | null>;
  /** What he's saying, or null. He turns round to talk. */
  message: string | null;
  onCloseBubble?: () => void;
}

export function Contact({ ref, message, onCloseBubble }: ContactProps) {
  const links = (Object.keys(site.contact) as (keyof typeof site.contact)[])
    .filter((k) => site.contact[k])
    .map((k) => ({
      label: labels[k],
      href: k === 'email' ? `mailto:${site.contact[k]}` : site.contact[k]!,
      display: k === 'email' ? site.contact[k]! : site.contact[k]!.replace(/^https?:\/\/(www\.)?/, ''),
    }));

  const [layout, setLayout] = useState<Layout | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLayout(fit(el)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  const place = (p: [number, number]): [number, number] =>
    layout ? [layout.x + p[0] * layout.scale, layout.y + p[1] * layout.scale] : p;
  const compact = !!layout && (SCREEN[1][0] - SCREEN[3][0]) * layout.scale < COMPACT_BELOW;
  const ui = compact ? UI_COMPACT : UI;

  return (
    <section
      id="contact"
      ref={ref}
      className={styles.scene}
      style={{ height: layout?.height }}
      data-speaking={message ? '' : undefined}
      aria-labelledby="contact-title"
    >
      <h2 id="contact-title" className="visually-hidden">
        Contact
      </h2>
      <div
        className={styles.photos}
        style={
          layout ? { left: layout.x, top: layout.y, width: PHOTO[0] * layout.scale, height: PHOTO[1] * layout.scale } : undefined
        }
      >
        <div className={styles.photo} data-pose="quiet">
          <img
            src={contactIdle}
            width={PHOTO[0]}
            height={PHOTO[1]}
            alt="Memoji at a desk, working on a laptop"
            draggable={false}
          />
        </div>
        <div className={styles.photo} data-pose="speaking">
          <img src={contactSpeaking} width={PHOTO[0]} height={PHOTO[1]} alt="" draggable={false} />
          <Face frame={FRAME} eyes={FACE.eyes} mouth={FACE.mouth} message={message} />
        </div>
      </div>
      <div
        className={styles.screen}
        style={{ width: ui[0], height: ui[1], transform: warp(ui, SCREEN.map(place)) }}
        data-ready={layout ? '' : undefined}
        data-compact={compact ? '' : undefined}
      >
        <p className={styles.bar} aria-hidden="true">
          ~/contact
        </p>
        {links.length ? (
          <ul className={styles.links}>
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href} target={l.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
                  <span className={styles.label}>{l.label}</span>
                  <span className={styles.value}>{l.display}</span>
                  <span className={styles.arrow} aria-hidden="true">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {layout && (
        <div className={styles.say} style={{ left: place(HEAD)[0], top: place(HEAD)[1] }}>
          <SpeechBubble className={styles.bubble} message={message} tailTip={TAIL_TIP} onClose={onCloseBubble} />
        </div>
      )}
    </section>
  );
}
