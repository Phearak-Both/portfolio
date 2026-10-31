import type { CSSProperties } from 'react';
import { typingMs } from '../../lib/typing';
import type { Box } from '../Standee/scenes';
import styles from './Face.module.css';
import { place, type Frame } from './place';

/** One open-and-close of the mouth while talking. */
const SYLLABLE_MS = 240;

interface FaceProps {
  frame: Frame;
  /** Eye openings, each with the skin colour just above it (for the eyelid). */
  eyes: (Box & { skin: string })[];
  /** Lip line, where the mouth opens while talking; tilt (degrees) follows a lopsided smile. */
  mouth?: Box & { tilt?: number };
  /** The line being said: the mouth moves while it types out. */
  message: string | null;
}

/**
 * Eyelids and a mouth drawn over a Memoji photo, in the face's own colours:
 * he blinks every few seconds, and talks while a line types out.
 */
export function Face({ frame, eyes, mouth, message }: FaceProps) {
  const syllables = message ? Math.max(2, Math.round(typingMs(message.length) / SYLLABLE_MS)) : 0;
  return (
    <div className={styles.face} aria-hidden="true">
      {eyes.map((eye, i) => (
        <i key={i} className={styles.lid} style={{ ...place(eye, frame), '--skin': eye.skin } as CSSProperties} />
      ))}
      {mouth && message && (
        <i
          key={message}
          className={styles.mouth}
          style={{ ...place(mouth, frame), rotate: `${mouth.tilt ?? 0}deg`, '--syllables': syllables } as CSSProperties}
        />
      )}
    </div>
  );
}
