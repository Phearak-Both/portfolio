import type { CSSProperties } from 'react';
import type { Box } from '../Standee/scenes';

/** The part of the source image that is shown, in its pixels. */
export interface Frame {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Positions a box given in source pixels over the shown part of the image. */
export function place({ x, y, w, h }: Box, frame: Frame): CSSProperties {
  return {
    left: `${((x - frame.left) / frame.width) * 100}%`,
    top: `${((y - frame.top) / frame.height) * 100}%`,
    width: `${(w / frame.width) * 100}%`,
    height: `${(h / frame.height) * 100}%`,
  };
}
