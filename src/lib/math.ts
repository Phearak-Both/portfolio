export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));
