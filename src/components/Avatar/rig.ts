import type { Mesh, Object3D } from 'three';
import type { AvatarConfig } from '../../config/avatar';

type MorphKey = keyof AvatarConfig['rig']['morphs'];

export interface MorphBinding {
  mesh: Mesh;
  index: number;
}

/** What a loaded model can actually do. Animation code only drives what is found here. */
export interface Rig {
  head?: Object3D;
  neck?: Object3D;
  leftEye?: Object3D;
  rightEye?: Object3D;
  morphs: Partial<Record<MorphKey, MorphBinding[]>>;
  capabilities: {
    eyeBones: boolean;
    eyeMorphs: boolean;
    blink: boolean;
    headBone: boolean;
  };
}

function findNode(root: Object3D, candidates: string[]): Object3D | undefined {
  const lowered = candidates.map((c) => c.toLowerCase());
  const nodes: Object3D[] = [];
  root.traverse((o) => nodes.push(o));
  const name = (o: Object3D) => o.name.toLowerCase();
  const score = (o: Object3D) => ((o as { isBone?: boolean }).isBone ? 0 : 1);

  const exact = nodes.filter((o) => lowered.includes(name(o))).sort((a, b) => score(a) - score(b));
  if (exact.length) return exact[0];
  // Substring fallback, but skip helper/end bones like "Head_end" or "HeadTop_End".
  return nodes
    .filter((o) => !/end$/i.test(o.name) && lowered.some((c) => name(o).includes(c)))
    .sort((a, b) => score(a) - score(b))[0];
}

function findMorphs(root: Object3D, candidates: string[]): MorphBinding[] {
  const lowered = candidates.map((c) => c.toLowerCase());
  const bindings: MorphBinding[] = [];
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
    for (const [morphName, index] of Object.entries(mesh.morphTargetDictionary)) {
      if (lowered.includes(morphName.toLowerCase())) bindings.push({ mesh, index });
    }
  });
  return bindings;
}

export function inspectRig(root: Object3D, rig: AvatarConfig['rig']): Rig {
  const morphs: Rig['morphs'] = {};
  for (const key of Object.keys(rig.morphs) as MorphKey[]) {
    const found = findMorphs(root, rig.morphs[key]);
    if (found.length) morphs[key] = found;
  }

  const result: Rig = {
    head: findNode(root, rig.head),
    neck: findNode(root, rig.neck),
    leftEye: findNode(root, rig.leftEye),
    rightEye: findNode(root, rig.rightEye),
    morphs,
    capabilities: { eyeBones: false, eyeMorphs: false, blink: false, headBone: false },
  };

  result.capabilities = {
    eyeBones: Boolean(result.leftEye || result.rightEye),
    eyeMorphs: Boolean(morphs.lookInLeft || morphs.lookOutLeft || morphs.lookUpLeft),
    blink: Boolean(morphs.blinkLeft || morphs.blinkRight || morphs.blink),
    headBone: Boolean(result.head),
  };

  return result;
}

export function setMorph(bindings: MorphBinding[] | undefined, value: number) {
  if (!bindings) return;
  for (const { mesh, index } of bindings) mesh.morphTargetInfluences![index] = value;
}

/** Logs everything a model exposes, to help map a new model's names in config/avatar.ts. */
export function logRigReport(root: Object3D, rig: Rig) {
  const nodes: string[] = [];
  const morphNames = new Set<string>();
  root.traverse((o) => {
    if (o.name) nodes.push(`${(o as { isBone?: boolean }).isBone ? 'bone' : o.type}:${o.name}`);
    const mesh = o as Mesh;
    if (mesh.morphTargetDictionary) Object.keys(mesh.morphTargetDictionary).forEach((m) => morphNames.add(m));
  });
  console.groupCollapsed('[avatar] model inspection');
  console.info('capabilities', rig.capabilities);
  console.info('matched', {
    head: rig.head?.name,
    neck: rig.neck?.name,
    leftEye: rig.leftEye?.name,
    rightEye: rig.rightEye?.name,
    morphs: Object.keys(rig.morphs),
  });
  console.info('nodes', nodes);
  console.info('morph targets', [...morphNames]);
  console.groupEnd();
}
