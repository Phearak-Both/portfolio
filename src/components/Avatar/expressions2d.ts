import type { Expression } from '../../config/expressions';
import type { HandleName } from './FaceRig2D';

export interface Preset2D {
  /** Handle displacements in source pixels (1024 space); negative y is up. */
  handles: Partial<Record<HandleName, [number, number]>>;
  /** Lower-lid raise per eye (image-left, image-right). */
  squint?: [number, number];
  /** Where the eyes drift while holding this expression (-1..1), and how strongly. */
  gaze?: { at: [number, number]; hold: number };
  /** One-shot wink when the expression starts. */
  wink?: 'left' | 'right';
  /** Talk (mouth moving) for this many seconds when the expression starts; Infinity talks while it's held. */
  talk?: number;
}

const smile: Preset2D = {
  handles: {
    mouthL: [-6, -11],
    mouthR: [6, -11],
    lipUpper: [0, -1],
    lipLower: [0, -2],
    cheekL: [-1, -7],
    cheekR: [1, -7],
    browLMid: [0, -3],
    browRMid: [0, -3],
  },
  squint: [0.42, 0.42],
};

export const presets2D: Record<Expression, Preset2D> = {
  neutral: { handles: {} },
  smile,
  /** Saying hello: friendly face, brows lifted, talking. */
  greet: {
    handles: {
      mouthL: [-3, -5],
      mouthR: [3, -5],
      cheekL: [0, -3],
      cheekR: [0, -3],
      browLIn: [0, -5],
      browLMid: [0, -7],
      browLOut: [0, -4],
      browRIn: [0, -5],
      browRMid: [0, -7],
      browROut: [0, -4],
    },
    squint: [0.2, 0.2],
    talk: 1.7,
  },
  /** Answering a chat question: relaxed, slightly friendly, talking until the line is typed. */
  explain: {
    handles: {
      mouthL: [-2, -4],
      mouthR: [2, -4],
      browLMid: [0, -3],
      browRMid: [0, -3],
    },
    squint: [0.12, 0.12],
    talk: Infinity,
  },
  /** Told to stop talking: lips pressed lightly together, a sheepish half-smile, a glance away. */
  hush: {
    handles: {
      mouthL: [4, 1],
      mouthR: [-3, -4.5],
      lipUpper: [0, 2],
      lipLower: [0, -3.5],
      jaw: [0, -1.5],
      cheekR: [0, -3.5],
      browLIn: [1, 2.5],
      browRIn: [-1, 2.5],
      browLMid: [0, 1],
      browRMid: [0, -1.5],
    },
    squint: [0.2, 0.3],
    gaze: { at: [-0.3, 0.35], hold: 0.55 },
  },
  salute: { ...smile, wink: 'right' },
  smirk: {
    handles: {
      mouthR: [6, -12],
      cheekR: [1, -6],
      mouthL: [2, 2],
      browLIn: [0, -9],
      browLMid: [0, -13],
      browLOut: [0, -8],
      browRIn: [2, 3],
      browRMid: [0, 1.5],
    },
    squint: [0, 0.38],
  },
  surprised: {
    handles: {
      browLIn: [0, -13],
      browLMid: [0, -16],
      browLOut: [0, -11],
      browRIn: [0, -13],
      browRMid: [0, -16],
      browROut: [0, -11],
      mouthL: [4, 1],
      mouthR: [-4, 1],
      lipLower: [0, 4],
    },
  },
  worried: {
    handles: {
      browLIn: [3, -14],
      browRIn: [-3, -14],
      browLMid: [0, -6],
      browRMid: [0, -6],
      browLOut: [0, 4],
      browROut: [0, 4],
      mouthL: [2, 7],
      mouthR: [-2, 7],
      lipLower: [0, -3],
    },
    squint: [0.15, 0.15],
  },
  thinking: {
    handles: {
      browLIn: [5, 5],
      browRIn: [-5, 5],
      browRMid: [0, -8],
      browROut: [0, -5],
      mouthL: [3, 1],
      mouthR: [5, -5],
    },
    squint: [0.25, 0.25],
    gaze: { at: [0.6, -0.8], hold: 0.85 },
  },
};
