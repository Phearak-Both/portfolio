/**
 * Avatar configuration. See docs/AVATAR.md for the model requirements.
 *
 * The site renders the 3D model when `modelUrl` points at a reachable
 * .glb and WebGL is available; otherwise it uses the 2D Memoji fallback.
 */
export interface BoneAxes {
  yaw: 'x' | 'y' | 'z';
  pitch: 'x' | 'y' | 'z';
  yawSign: 1 | -1;
  pitchSign: 1 | -1;
}

export const avatarConfig = {
  /** Path to the model inside /public. Set to null to always use the 2D fallback. */
  modelUrl: '/models/avatar.glb' as string | null,

  /** Model transform, applied to the loaded scene. */
  scale: 1,
  position: [0, -1.55, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],

  /** Camera framing for head + upper body. */
  camera: { fov: 26, position: [0, 0.1, 4.2] as [number, number, number] },

  gaze: {
    /** Max eye rotation in radians (yaw, pitch). */
    eyeYaw: 0.38,
    eyePitch: 0.22,
    /** Max head rotation in radians. Set to 0 to keep the head still. */
    headYaw: 0.12,
    headPitch: 0.07,
    /** Smoothing rates (higher = snappier). */
    eyeDamping: 12,
    headDamping: 4,
    /** Seconds without pointer movement before the gaze relaxes to neutral. */
    idleAfter: 4,
    /**
     * Local rotation axes of the eye and head bones. Rigs differ: if the
     * avatar looks away from the cursor, flip the sign; if it nods instead
     * of turning, swap the axes.
     */
    eyeAxes: { yaw: 'y', pitch: 'x', yawSign: 1, pitchSign: 1 } as BoneAxes,
    headAxes: { yaw: 'y', pitch: 'x', yawSign: 1, pitchSign: 1 } as BoneAxes,
  },

  idle: {
    floatAmplitude: 0.025,
    floatSpeed: 0.9,
    breathAmplitude: 0.006,
    /** Seconds between blinks (random within range). */
    blinkInterval: [2.4, 5.5] as [number, number],
    blinkDuration: 0.14,
  },

  /**
   * Names the rig inspector looks for (case-insensitive, substring match).
   * Add your model's names here if it uses a different convention.
   */
  rig: {
    head: ['Head', 'head'],
    neck: ['Neck'],
    leftEye: ['LeftEye', 'Eye_L', 'eye_l', 'EyeLeft', 'L_Eye'],
    rightEye: ['RightEye', 'Eye_R', 'eye_r', 'EyeRight', 'R_Eye'],
    /** ARKit-style blendshape names (used by Ready Player Me, Apple ARKit, many Memoji-likes). */
    morphs: {
      blinkLeft: ['eyeBlinkLeft', 'eyeBlink_L', 'Blink_L'],
      blinkRight: ['eyeBlinkRight', 'eyeBlink_R', 'Blink_R'],
      blink: ['blink', 'eyesClosed'],
      lookUpLeft: ['eyeLookUpLeft'],
      lookUpRight: ['eyeLookUpRight'],
      lookDownLeft: ['eyeLookDownLeft'],
      lookDownRight: ['eyeLookDownRight'],
      lookInLeft: ['eyeLookInLeft'],
      lookInRight: ['eyeLookInRight'],
      lookOutLeft: ['eyeLookOutLeft'],
      lookOutRight: ['eyeLookOutRight'],
      smile: ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight'],
    },
  },
};

export type AvatarConfig = typeof avatarConfig;
