import type { CSSProperties, Ref } from 'react';
import { site } from '../../config/site';
import { Face } from '../Face/Face';
import { place } from '../Face/place';
import { SpeechBubble } from '../SpeechBubble/SpeechBubble';
import type { Box, Pose, Scene } from './scenes';
import styles from './Standee.module.css';

interface StandeeProps {
  ref?: Ref<HTMLDivElement>;
  scene: Scene;
  /** Which side of the balloon the tail leaves from; pick the side with room for the balloon to extend. */
  tail?: 'left' | 'right';
  /** What he's saying, or null when quiet. */
  message: string | null;
  onCloseBubble?: () => void;
  className?: string;
}

/** Where the balloon's tail tip sits, measured from its tail side. */
const TAIL_TIP = 0.25;

/**
 * A Memoji scene with two poses: quiet, and speaking (shown while a balloon
 * is up). He blinks, and his mouth moves while a line types out.
 */
export function Standee({ ref, scene, tail = 'left', message, onCloseBubble, className }: StandeeProps) {
  /** A soft-edged mask showing only the given box of the photo. */
  const patch = (box: Box): CSSProperties => {
    const p = place(box, scene.crop);
    const [l, t, w, h] = [p.left, p.top, p.width, p.height].map((v) => parseFloat(String(v)));
    const mask = {
      maskImage: 'radial-gradient(closest-side, #000 55%, transparent)',
      maskSize: `${w}% ${h}%`,
      maskPosition: `${(l / (100 - w)) * 100}% ${(t / (100 - h)) * 100}%`,
      maskRepeat: 'no-repeat',
    };
    return {
      ...mask,
      WebkitMaskImage: mask.maskImage,
      WebkitMaskSize: mask.maskSize,
      WebkitMaskPosition: mask.maskPosition,
      WebkitMaskRepeat: mask.maskRepeat,
    };
  };

  const layer = (pose: Pose, kind: 'quiet' | 'speaking') => (
    <div className={styles.pose} data-pose={kind}>
      <img
        src={pose.src}
        width={scene.size[0]}
        height={scene.size[1]}
        alt={kind === 'quiet' ? `${site.brand}'s Memoji, ${scene.alt}` : ''}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      {pose.typing && (
        // The mask stays put and only the copy inside it moves, so the copy
        // always covers the original hands underneath (no doubled edge).
        <div className={styles.typing} style={patch(pose.typing)}>
          <img src={pose.src} alt="" draggable={false} />
        </div>
      )}
      <Face frame={scene.crop} eyes={pose.eyes} mouth={pose.mouth} message={message} />
    </div>
  );

  return (
    <div
      ref={ref}
      className={[styles.standee, className].filter(Boolean).join(' ')}
      style={
        {
          '--head-x': scene.headX,
          '--tip-x': tail === 'left' ? TAIL_TIP : 1 - TAIL_TIP,
          '--aspect': `${scene.size[0]} / ${scene.size[1]}`,
        } as CSSProperties
      }
      data-speaking={message ? true : undefined}
      data-motion={scene.motion}
    >
      <SpeechBubble
        message={message}
        tail={tail}
        tailTip={TAIL_TIP}
        onClose={onCloseBubble}
        className={styles.bubble}
      />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.figure}>
        <div className={styles.body}>
          {layer(scene.quiet, 'quiet')}
          {layer(scene.speaking, 'speaking')}
        </div>
      </div>
    </div>
  );
}
