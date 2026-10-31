import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Euler, Group, MathUtils, PMREMGenerator, Quaternion, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { avatarConfig, type BoneAxes } from '../../config/avatar';
import type { Expression } from '../../config/expressions';
import { pointer } from '../../hooks/pointer';
import { inspectRig, logRigReport, setMorph, type Rig } from './rig';
import styles from './Avatar.module.css';

interface Avatar3DProps {
  url: string;
  expression: Expression;
  reducedMotion: boolean;
  paused: boolean;
}

/** Real-time 3D avatar. Lazy-loaded; only rendered when a model file exists. */
export default function Avatar3D({ url, expression, reducedMotion, paused }: Avatar3DProps) {
  const { camera } = avatarConfig;
  return (
    <Canvas
      className={styles.canvas}
      frameloop={paused ? 'never' : 'always'}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: camera.fov, position: camera.position, near: 0.1, far: 50 }}
      aria-hidden="true"
    >
      <Lighting />
      <Model url={url} expression={expression} reducedMotion={reducedMotion} />
    </Canvas>
  );
}

function Lighting() {
  const gl = useThree((s) => s.gl);
  // Soft studio reflections for PBR materials, generated once (no HDR download).
  const env = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);

  return (
    <>
      <primitive object={env} attach="environment" />
      <ambientLight intensity={0.25} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.6} />
      <directionalLight position={[-3, 2, -2]} intensity={1.1} color="#dfe6ff" />
      <directionalLight position={[0, -1, 3]} intensity={0.25} />
    </>
  );
}

const euler = new Euler();
const offset = new Quaternion();
const headWorld = new Vector3();

function applyRotation(bone: Object3D, rest: Quaternion, axes: BoneAxes, yaw: number, pitch: number) {
  euler.set(0, 0, 0);
  euler[axes.yaw] += yaw * axes.yawSign;
  euler[axes.pitch] += pitch * axes.pitchSign;
  bone.quaternion.copy(rest).multiply(offset.setFromEuler(euler));
}

/** How much each expression smiles, for models with mouthSmile morphs. */
const SMILE: Partial<Record<Expression, number>> = { greet: 1, smile: 0.7, salute: 0.7, smirk: 0.4, explain: 0.2 };

function Model({ url, expression, reducedMotion }: { url: string; expression: Expression; reducedMotion: boolean }) {
  const gltf = useLoader(GLTFLoader, url, (loader) => loader.setMeshoptDecoder(MeshoptDecoder));
  const group = useRef<Group>(null);
  const { gaze, idle, rig: rigNames, scale, position, rotation } = avatarConfig;

  const rig: Rig = useMemo(() => inspectRig(gltf.scene, rigNames), [gltf.scene, rigNames]);
  const rest = useMemo(() => {
    const q = (o?: Object3D) => o?.quaternion.clone();
    return { head: q(rig.head), leftEye: q(rig.leftEye), rightEye: q(rig.rightEye) };
  }, [rig]);

  useEffect(() => {
    if (import.meta.env.DEV) logRigReport(gltf.scene, rig);
  }, [gltf.scene, rig]);

  const motion = useRef({ eyeX: 0, eyeY: 0, headX: 0, headY: 0, smile: 0, nextBlink: 1.5, blinkAt: -1 });

  useFrame(({ clock, camera, gl }, delta) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const m = motion.current;
    const dt = Math.min(delta, 0.1);

    // Gaze target in -1..1, relative to where the head is on screen.
    let tx = 0;
    let ty = 0;
    const engaged = pointer.inside && (performance.now() - pointer.lastMove) / 1000 < gaze.idleAfter;
    if (engaged) {
      (rig.head ?? g).getWorldPosition(headWorld).project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      const hx = rect.left + ((headWorld.x + 1) / 2) * rect.width;
      const hy = rect.top + ((1 - headWorld.y) / 2) * rect.height;
      tx = MathUtils.clamp((pointer.x - hx) / (window.innerWidth * 0.5), -1, 1);
      ty = MathUtils.clamp((pointer.y - hy) / (window.innerHeight * 0.5), -1, 1);
    } else if (!reducedMotion) {
      // Unhurried idle glances.
      tx = Math.sin(t * 0.37) * 0.12;
      ty = Math.sin(t * 0.23 + 1.3) * 0.05;
    }

    m.eyeX = MathUtils.damp(m.eyeX, tx, gaze.eyeDamping, dt);
    m.eyeY = MathUtils.damp(m.eyeY, ty, gaze.eyeDamping, dt);
    m.headX = MathUtils.damp(m.headX, tx, gaze.headDamping, dt);
    m.headY = MathUtils.damp(m.headY, ty, gaze.headDamping, dt);

    // Eyes: bones if present, otherwise ARKit-style look morphs.
    const eyeYaw = m.eyeX * gaze.eyeYaw;
    const eyePitch = m.eyeY * gaze.eyePitch;
    if (rig.leftEye && rest.leftEye) applyRotation(rig.leftEye, rest.leftEye, gaze.eyeAxes, eyeYaw, eyePitch);
    if (rig.rightEye && rest.rightEye) applyRotation(rig.rightEye, rest.rightEye, gaze.eyeAxes, eyeYaw, eyePitch);
    if (!rig.capabilities.eyeBones && rig.capabilities.eyeMorphs) {
      const right = Math.max(0, m.eyeX);
      const left = Math.max(0, -m.eyeX);
      setMorph(rig.morphs.lookOutLeft, right);
      setMorph(rig.morphs.lookInRight, right);
      setMorph(rig.morphs.lookInLeft, left);
      setMorph(rig.morphs.lookOutRight, left);
      setMorph(rig.morphs.lookUpLeft, Math.max(0, -m.eyeY));
      setMorph(rig.morphs.lookUpRight, Math.max(0, -m.eyeY));
      setMorph(rig.morphs.lookDownLeft, Math.max(0, m.eyeY));
      setMorph(rig.morphs.lookDownRight, Math.max(0, m.eyeY));
    }

    // Head: the head bone if present, otherwise turn the whole model a little.
    const headYaw = m.headX * gaze.headYaw;
    const headPitch = m.headY * gaze.headPitch;
    if (rig.head && rest.head) {
      applyRotation(rig.head, rest.head, gaze.headAxes, headYaw, headPitch);
      g.rotation.set(rotation[0], rotation[1], rotation[2]);
    } else {
      g.rotation.set(rotation[0] + headPitch, rotation[1] + headYaw, rotation[2]);
    }

    // Idle float + breathing.
    const float = reducedMotion ? 0 : Math.sin(t * idle.floatSpeed) * idle.floatAmplitude;
    const breath = reducedMotion ? 0 : Math.sin(t * 1.7) * idle.breathAmplitude;
    g.position.set(position[0], position[1] + float, position[2]);
    g.scale.set(scale, scale * (1 + breath), scale);

    // Expression, as far as the model's morphs allow.
    m.smile = MathUtils.damp(m.smile, SMILE[expression] ?? 0, 9, dt);
    setMorph(rig.morphs.smile, m.smile);

    // Blink, only if the model has blink morphs.
    if (rig.capabilities.blink) {
      if (m.blinkAt < 0 && t >= m.nextBlink) m.blinkAt = t;
      let value = 0;
      if (m.blinkAt >= 0) {
        const p = (t - m.blinkAt) / idle.blinkDuration;
        value = p < 1 ? Math.sin(p * Math.PI) : 0;
        if (p >= 1) {
          m.blinkAt = -1;
          const [min, max] = idle.blinkInterval;
          // Occasional double blink.
          m.nextBlink = t + (Math.random() < 0.15 ? 0.18 : MathUtils.randFloat(min, max));
        }
      }
      setMorph(rig.morphs.blinkLeft, value);
      setMorph(rig.morphs.blinkRight, value);
      setMorph(rig.morphs.blink, value);
    }
  });

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}
