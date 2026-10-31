/** Typewriter pacing shared by the speech balloon and whoever times what it says. */

/** Milliseconds per character for short lines. */
const CHAR_MS = 32;
/** Long lines speed up so none takes longer than this to type. */
const MAX_TYPE_MS = 2600;

/** Characters revealed per tick, so a long answer still types out in MAX_TYPE_MS. */
export function typingStep(length: number): number {
  return Math.max(1, Math.ceil((length * CHAR_MS) / MAX_TYPE_MS));
}

/** How long a line of `length` characters takes to type out. */
export function typingMs(length: number): number {
  return Math.ceil(length / typingStep(length)) * CHAR_MS;
}

export const TYPE_TICK_MS = CHAR_MS;
