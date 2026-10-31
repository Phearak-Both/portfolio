/**
 * A single shared pointer tracker. Values live in a mutable object so
 * animation loops can read them every frame without React re-renders.
 */
export interface PointerState {
  /** Client coordinates in px. */
  x: number;
  y: number;
  /** True while the pointer is inside the window. */
  inside: boolean;
  /** performance.now() of the last movement. */
  lastMove: number;
}

export const pointer: PointerState = { x: 0, y: 0, inside: false, lastMove: 0 };

let subscribers = 0;

const onMove = (e: PointerEvent) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.inside = true;
  pointer.lastMove = performance.now();
};
const onLeave = () => {
  pointer.inside = false;
};
const onDocLeave = (e: MouseEvent) => {
  if (!e.relatedTarget) onLeave();
};

/** Starts tracking; returns a cleanup. Ref-counted so multiple consumers share one listener. */
export function trackPointer(): () => void {
  if (subscribers++ === 0) {
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    document.addEventListener('mouseout', onDocLeave);
    window.addEventListener('blur', onLeave);
  }
  return () => {
    if (--subscribers === 0) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.removeEventListener('mouseout', onDocLeave);
      window.removeEventListener('blur', onLeave);
    }
  };
}
