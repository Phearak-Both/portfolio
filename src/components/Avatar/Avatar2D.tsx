import { useEffect, useRef, useState } from 'react';
import memoji from '../../assets/memoji/hero.webp';
import memojiEyes from '../../assets/memoji/hero-eyes.png';
import { avatarConfig } from '../../config/avatar';
import type { Expression } from '../../config/expressions';
import { site } from '../../config/site';
import { pointer } from '../../hooks/pointer';
import { clamp, damp } from '../../lib/math';
import { presets2D } from './expressions2d';
import { FaceRig2D, type HandleName, type RigPose } from './FaceRig2D';
import rigData from './faceRig.json';
import styles from './Avatar.module.css';

interface Avatar2DProps {
  expression: Expression;
  reducedMotion: boolean;
  paused: boolean;
}

/** Where the eyes are in the image, for aiming the gaze at the cursor. */
const EYES_AT = [
  (rigData.eyes.left.iris[0] + rigData.eyes.right.iris[0]) / 2 / rigData.size,
  rigData.eyes.left.iris[1] / rigData.size,
];

/**
 * The Memoji as a living 2D avatar. A WebGL face rig (FaceRig2D) moves the
 * eyes, lids, brows and mouth; if WebGL is unavailable the plain image shows.
 */
export function Avatar2D({ expression, reducedMotion, paused }: Avatar2DProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<FaceRig2D | null>(null);
  const expressionRef = useRef(expression);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);

  // Attach to the canvas's rig (created once per canvas; freed with the canvas).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    FaceRig2D.create(canvas, memoji, memojiEyes)
      .then((rig) => {
        if (!rig || !active) return;
        rigRef.current = rig;
        setReady(true);
      })
      .catch((err) => console.warn('[avatar] 2D face rig unavailable, showing the still image.', err));
    const onLost = () => {
      rigRef.current = null;
      setReady(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => {
      active = false;
      canvas.removeEventListener('webglcontextlost', onLost);
      rigRef.current = null;
    };
  }, []);

  // Keep the drawing buffer matched to the element size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      rigRef.current?.resize(Math.round(canvas.clientWidth * dpr), Math.round(canvas.clientHeight * dpr));
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [ready]);

  // Animation loop: gaze, head, blink, expression, studio light.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || paused) return;
    const { gaze: g, idle } = avatarConfig;
    const handleNames = Object.keys(rigData.handles) as HandleName[];
    const pose: RigPose = { gaze: [0, 0], head: [0, 0], blink: [0, 0], squint: [0, 0], mouth: 0, handles: {} };
    const current: Record<string, [number, number]> = Object.fromEntries(handleNames.map((h) => [h, [0, 0]]));
    const squint: [number, number] = [0, 0];
    const light = [0, 0];
    let blinkAt = -1;
    let nextBlink = 1.2;
    let wink: { eye: 0 | 1; at: number } | null = null;
    let talk: { from: number; to: number } | null = null;
    let lastExpression = expressionRef.current;
    let frame = 0;
    let last = performance.now();
    const start = last;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const t = (now - start) / 1000;
      const preset = presets2D[expressionRef.current];

      // Expression changes come with a blink (and a wink, if the preset has one).
      if (expressionRef.current !== lastExpression) {
        lastExpression = expressionRef.current;
        if (preset.wink) wink = { eye: preset.wink === 'left' ? 0 : 1, at: t };
        else if (blinkAt < 0) blinkAt = t;
        talk = preset.talk ? { from: t, to: t + preset.talk } : null;
      }

      // Gaze target relative to the eyes on screen.
      const rect = stage.getBoundingClientRect();
      const engaged = pointer.inside && (now - pointer.lastMove) / 1000 < g.idleAfter;
      let tx = 0;
      let ty = 0;
      if (engaged) {
        tx = clamp((pointer.x - (rect.left + rect.width * EYES_AT[0])) / (window.innerWidth * 0.4), -1, 1);
        ty = clamp((pointer.y - (rect.top + rect.height * EYES_AT[1])) / (window.innerHeight * 0.4), -1, 1);
      } else if (!reducedMotion) {
        tx = Math.sin(t * 0.37) * 0.2;
        ty = Math.sin(t * 0.23 + 1.3) * 0.12;
      }
      if (preset.gaze) {
        tx += (preset.gaze.at[0] - tx) * preset.gaze.hold;
        ty += (preset.gaze.at[1] - ty) * preset.gaze.hold;
      }
      pose.gaze[0] = damp(pose.gaze[0], tx, g.eyeDamping, dt);
      pose.gaze[1] = damp(pose.gaze[1], ty, g.eyeDamping, dt);
      const headScale = reducedMotion ? 0 : 1;
      pose.head[0] = damp(pose.head[0], tx * headScale, g.headDamping, dt);
      pose.head[1] = damp(pose.head[1], ty * headScale, g.headDamping, dt);

      // Expression: ease every handle toward the preset.
      for (const name of handleNames) {
        const target = preset.handles[name] ?? [0, 0];
        const c = current[name];
        c[0] = damp(c[0], target[0], 9, dt);
        c[1] = damp(c[1], target[1], 9, dt);
        pose.handles[name] = c;
      }
      // Talking: syllable-rate mouth movement with uneven emphasis and short pauses.
      let open = 0;
      if (talk && t < talk.to) {
        const tt = t - talk.from;
        const envelope = Math.min(1, tt / 0.12, (talk.to - t) / 0.2);
        const syllable = 0.5 - 0.5 * Math.cos(tt * Math.PI * 2 * 4.2);
        const emphasis = 0.65 + 0.35 * Math.sin(tt * Math.PI * 2 * 1.3 + 0.7);
        const pause = Math.sin(tt * Math.PI * 2 * 0.9 + 1.2) < -0.75 ? 0.25 : 1;
        open = envelope * syllable ** 1.4 * emphasis * pause;
      } else if (talk) {
        talk = null;
      }
      pose.mouth = damp(pose.mouth, open, 28, dt);
      const m = pose.mouth;
      if (m > 0.001) {
        // Jaw drops and the lips part around the opening.
        pose.handles.jaw = [0, current.jaw[1] + 7 * m];
        pose.handles.lipLower = [current.lipLower[0], current.lipLower[1] + 7.5 * m];
        pose.handles.lipUpper = [current.lipUpper[0], current.lipUpper[1] - 2 * m];
        pose.handles.mouthL = [current.mouthL[0] + 1.2 * m, current.mouthL[1]];
        pose.handles.mouthR = [current.mouthR[0] - 1.2 * m, current.mouthR[1]];
      }

      squint[0] = damp(squint[0], preset.squint?.[0] ?? 0, 9, dt);
      squint[1] = damp(squint[1], preset.squint?.[1] ?? 0, 9, dt);
      pose.squint = squint;

      // Blinking.
      if (blinkAt < 0 && t >= nextBlink) blinkAt = t;
      let b = 0;
      if (blinkAt >= 0) {
        const p = (t - blinkAt) / idle.blinkDuration;
        b = p < 1 ? Math.sin(p * Math.PI) : 0;
        if (p >= 1) {
          blinkAt = -1;
          const [min, max] = idle.blinkInterval;
          nextBlink = t + (Math.random() < 0.15 ? 0.2 : min + Math.random() * (max - min));
        }
      }
      pose.blink[0] = b;
      pose.blink[1] = b;
      if (wink) {
        const p = (t - wink.at) / 0.5;
        const w = p < 1 ? Math.min(1, Math.sin(p * Math.PI) * 1.6) : 0;
        pose.blink[wink.eye] = Math.max(pose.blink[wink.eye], w);
        if (p >= 1) wink = null;
      }

      rigRef.current?.render(pose);

      // Studio light drifts toward the cursor.
      if (!reducedMotion) {
        light[0] = damp(light[0], engaged ? tx : 0, 3, dt);
        light[1] = damp(light[1], engaged ? ty : 0, 3, dt);
        stage.style.setProperty('--lx', light[0].toFixed(4));
        stage.style.setProperty('--ly', light[1].toFixed(4));
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, ready]);

  return (
    <div ref={stageRef} className={styles.fallback} data-paused={paused || undefined} data-rig={ready || undefined}>
      <div className={styles.light} aria-hidden="true" />
      <div className={styles.float}>
        <div className={styles.figure}>
          <img
            className={styles.still}
            src={memoji}
            width={2048}
            height={2048}
            alt={`${site.brand}'s Memoji: short swept black hair, calm expression, black turtleneck`}
            fetchPriority="high"
            decoding="async"
            draggable={false}
          />
          <canvas ref={canvasRef} className={styles.rig} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
