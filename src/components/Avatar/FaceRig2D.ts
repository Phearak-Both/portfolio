/**
 * A 2D face rig for the Memoji image, in plain WebGL.
 *
 * The image is drawn on a grid mesh whose vertices are pushed around by
 * soft "handles" (brows, mouth corners, cheeks, face) to make expressions.
 * The fragment shader then redraws the eyes: the irises are painted out of
 * a small eye texture and re-sampled from the image at an offset, so they
 * can look around, and eyelids are drawn over the openings to blink/squint.
 * Landmarks live in faceRig.json.
 */
import rig from './faceRig.json';

export type HandleName = keyof typeof rig.handles;

export interface RigPose {
  /** Iris offset, -1..1 on each axis. */
  gaze: [number, number];
  /** Subtle head turn, -1..1. */
  head: [number, number];
  /** 0 open … 1 closed, per eye (image-left, image-right). */
  blink: [number, number];
  /** Lower-lid raise, 0..1, per eye. */
  squint: [number, number];
  /** Mouth opening for speech, 0 closed … 1 open. */
  mouth: number;
  /** Handle displacements in source pixels (1024 space). */
  handles: Partial<Record<HandleName, [number, number]>>;
}

const GRID = 96;
const MOUTH_OPEN = rig.mouth.maxOpen.toFixed(2);
const S = rig.size;
/** Max iris travel in source px: [left/right, up, down]. */
const IRIS_RANGE = [10, 2.5, 4];
/** Head turn in source px for the face handle and the nose (which sits "in front"). */
const HEAD_RANGE = { face: [7, 4], nose: [3.5, 2] };

const vert = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_pos.x * 2.0 - 1.0, 1.0 - a_pos.y * 2.0, 0.0, 1.0);
}`;

const frag = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_img;
uniform sampler2D u_eyes;
uniform vec4 u_box;
uniform vec2 u_iris[2];
uniform float u_irisR;
uniform vec2 u_gaze;
uniform vec2 u_blink;
uniform vec2 u_squint;
uniform float u_mouth;
uniform vec4 u_mouthShape;
uniform sampler2D u_lids;
const float PX = 1.0 / ${S.toFixed(1)};

vec4 eyeTex(vec2 uv) {
  return texture2D(u_eyes, (uv - u_box.xy) / (u_box.zw - u_box.xy));
}

// Smooth lid skin: several samples above the lash line, so a single noisy
// texel row doesn't turn into vertical streaks.
vec3 skinAbove(float x, float y) {
  return (texture2D(u_img, vec2(x - 2.0 * PX, y - 14.0 * PX)).rgb + texture2D(u_img, vec2(x + 2.0 * PX, y - 17.0 * PX)).rgb +
          texture2D(u_img, vec2(x, y - 21.0 * PX)).rgb) / 3.0;
}

// Mouth opening for speech: a dark gap along the lip line, widest in the
// middle and closed at the corners. u_mouthShape: centre x, centre y,
// half width, corner drop of the lip line.
vec3 mouth(vec3 c) {
  vec2 m = v_uv - u_mouthShape.xy;
  float nx = m.x / u_mouthShape.z;
  if (u_mouth < 0.001 || abs(nx) >= 1.0) return c;
  float seam = u_mouthShape.w * nx * nx * nx * nx;
  float half_h = u_mouth * ${MOUTH_OPEN} * PX * pow(1.0 - nx * nx, 0.7);
  float d = (m.y - seam) / max(half_h, 1e-5);
  float a = 1.0 - smoothstep(0.7, 1.0, abs(d));
  vec3 inside = mix(vec3(0.22, 0.08, 0.08), vec3(0.09, 0.03, 0.035), smoothstep(-1.0, 1.0, d));
  return mix(c, inside, a);
}

void main() {
  vec4 col = texture2D(u_img, v_uv);
  if (!(all(greaterThan(v_uv, u_box.xy - vec2(0.0, 8.0 * PX))) && all(lessThan(v_uv, u_box.zw)))) {
    gl_FragColor = vec4(mouth(col.rgb), col.a);
    return;
  }
  bool L = v_uv.x < 0.5;
  // Per-column lid lines of the eye opening (r: top, g: bottom, b: fades out at the corners).
  vec4 lids = texture2D(u_lids, vec2((v_uv.x - u_box.x) / (u_box.z - u_box.x), 0.5));
  float top = u_box.y + lids.r * (u_box.w - u_box.y);
  float bot = u_box.y + lids.g * (u_box.w - u_box.y);
  float across = lids.b;
  float blink = L ? u_blink.x : u_blink.y;
  float squint = L ? u_squint.x : u_squint.y;

  vec4 e = eyeTex(v_uv);
  vec3 c3 = col.rgb;
  if (e.a > 0.0) {
    // Iris: re-sample the original iris at an offset. Where the lid covered
    // it in the source, fill with the dark iris rim instead of lid skin.
    vec2 c = L ? u_iris[0] : u_iris[1];
    vec3 eye = e.rgb;
    vec2 src = v_uv - u_gaze;
    float ia = 1.0 - smoothstep(u_irisR - 1.2 * PX, u_irisR + 0.4 * PX, distance(src, c));
    vec3 iris = mix(vec3(0.15, 0.1, 0.085), texture2D(u_img, src).rgb, smoothstep(0.35, 0.9, eyeTex(src).a));
    eye = mix(eye, iris, ia);

    // Lower lid rises for a smile squint.
    float low = mix(bot, mix(top, bot, 0.55), squint);
    float coverL = smoothstep(low - PX, low + PX, v_uv.y) * smoothstep(0.0, 0.05, squint);
    vec3 lidL = texture2D(u_img, vec2(v_uv.x, bot + 7.0 * PX)).rgb;
    lidL *= mix(0.9, 1.0, smoothstep(low, bot + 2.0 * PX, v_uv.y));
    eye = mix(eye, lidL, coverL);

    c3 = mix(c3, eye, e.a);
  }

  // Upper lid: as it comes down it carries the lash line with it, so the
  // source lash band above the opening is covered with skin too.
  float on = smoothstep(0.0, 0.06, blink) * across;
  if (on > 0.0) {
    float edge = mix(top, bot + 0.5 * PX, blink);
    float band = smoothstep(top - 13.0 * PX, top - 5.0 * PX, v_uv.y) * smoothstep(0.0, 0.35, blink);
    float cover = (1.0 - smoothstep(edge - PX, edge + PX, v_uv.y)) * max(band, e.a);
    vec3 lid = skinAbove(v_uv.x, top) * mix(1.0, 0.9, smoothstep(top, edge + PX, v_uv.y));
    c3 = mix(c3, lid, cover * on);
    float lash = 1.0 - smoothstep(0.6 * PX, 2.6 * PX, abs(v_uv.y - edge + 0.8 * PX));
    c3 = mix(c3, vec3(0.09, 0.065, 0.055), lash * on);
  }

  gl_FragColor = vec4(c3, col.a);
}`;

/**
 * A one-row texture with, per column of the eye box, where the opening's
 * top and bottom lids are (traced from the opening polygons).
 */
function lidMap(): ImageData {
  const [x0, y0, x1, y1] = rig.eyeBox;
  const width = x1 - x0;
  const map = new ImageData(width, 1);
  for (const { opening } of Object.values(rig.eyes)) {
    const xs = opening.map((p) => p[0]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    for (let col = 0; col < width; col++) {
      const x = x0 + col + 0.5;
      if (x <= minX || x >= maxX) continue;
      const ys: number[] = [];
      for (let i = 0, j = opening.length - 1; i < opening.length; j = i++) {
        const [xi, yi] = opening[i];
        const [xj, yj] = opening[j];
        if (xi > x !== xj > x) ys.push(yi + ((x - xi) * (yj - yi)) / (xj - xi));
      }
      if (ys.length < 2) continue;
      const fade = Math.min(1, (x - minX) / 6, (maxX - x) / 6);
      map.data.set(
        [((Math.min(...ys) - y0) / (y1 - y0)) * 255, ((Math.max(...ys) - y0) / (y1 - y0)) * 255, fade * 255, 255],
        col * 4,
      );
    }
  }
  return map;
}

const rigs = new WeakMap<HTMLCanvasElement, Promise<FaceRig2D | null>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  return img.decode().then(() => img);
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
  return shader;
}

export class FaceRig2D {
  private gl: WebGLRenderingContext;
  private positions: Float32Array;
  private rest: Float32Array;
  private posBuffer: WebGLBuffer;
  private indexCount: number;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  /** Per handle: vertex indices it influences and their weights. */
  private influence: Record<string, { index: Uint16Array; weight: Float32Array }> = {};

  /**
   * One rig per canvas: a canvas has a single WebGL context, so mounting
   * twice (React StrictMode does) must reuse the rig rather than build a
   * second one on the same context.
   */
  static create(canvas: HTMLCanvasElement, imageUrl: string, eyesUrl: string): Promise<FaceRig2D | null> {
    let rig = rigs.get(canvas);
    if (!rig) {
      rig = (async () => {
        const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
        if (!gl) return null;
        const [image, eyes] = await Promise.all([loadImage(imageUrl), loadImage(eyesUrl)]);
        return new FaceRig2D(gl, image, eyes);
      })();
      rigs.set(canvas, rig);
      rig.catch(() => rigs.delete(canvas));
    }
    return rig;
  }

  private constructor(gl: WebGLRenderingContext, image: HTMLImageElement, eyes: HTMLImageElement) {
    this.gl = gl;
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vert));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
    gl.useProgram(program);

    // Grid mesh over the whole image.
    const n = GRID + 1;
    this.rest = new Float32Array(n * n * 2);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        this.rest[(y * n + x) * 2] = x / GRID;
        this.rest[(y * n + x) * 2 + 1] = y / GRID;
      }
    this.positions = this.rest.slice();
    const indices = new Uint16Array(GRID * GRID * 6);
    let k = 0;
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const i = y * n + x;
        indices.set([i, i + 1, i + n, i + 1, i + n + 1, i + n], k);
        k += 6;
      }
    this.indexCount = indices.length;

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.rest, gl.STATIC_DRAW);
    const aUv = gl.getAttribLocation(program, 'a_uv');
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    this.posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // Gaussian falloff per handle, precomputed since rest positions never change.
    for (const [name, h] of Object.entries(rig.handles)) {
      const cx = h.at[0] / S;
      const cy = h.at[1] / S;
      const r = h.radius / S;
      const idx: number[] = [];
      const w: number[] = [];
      for (let i = 0; i < n * n; i++) {
        const dx = this.rest[i * 2] - cx;
        const dy = this.rest[i * 2 + 1] - cy;
        const weight = Math.exp(-(dx * dx + dy * dy) / (r * r));
        if (weight > 0.01) {
          idx.push(i);
          w.push(weight);
        }
      }
      this.influence[name] = { index: Uint16Array.from(idx), weight: Float32Array.from(w) };
    }

    this.texture(0, image, true);
    this.texture(1, eyes, false);
    this.texture(2, lidMap(), false);

    for (const name of ['u_img', 'u_eyes', 'u_lids', 'u_box', 'u_iris', 'u_irisR', 'u_gaze', 'u_blink', 'u_squint', 'u_mouth', 'u_mouthShape'])
      this.uniforms[name] = gl.getUniformLocation(program, name);

    const px = (p: number[]) => [p[0] / S, p[1] / S];
    const { left, right } = rig.eyes;
    gl.uniform1i(this.uniforms.u_img, 0);
    gl.uniform1i(this.uniforms.u_eyes, 1);
    gl.uniform1i(this.uniforms.u_lids, 2);
    gl.uniform4fv(this.uniforms.u_box, rig.eyeBox.map((v) => v / S));
    gl.uniform2fv(this.uniforms.u_iris, [...px(left.iris), ...px(right.iris)]);
    gl.uniform1f(this.uniforms.u_irisR, rig.irisRadius / S);
    const { center, halfWidth, cornerDrop } = rig.mouth;
    gl.uniform4f(this.uniforms.u_mouthShape, center[0] / S, center[1] / S, halfWidth / S, cornerDrop / S);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  private texture(unit: number, image: TexImageSource, premultiply: boolean) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    // Mipmaps keep the large cut-out clean when drawn smaller than its size
    // (WebGL1 only allows them for power-of-two textures).
    const { width, height } = image as { width: number; height: number };
    const pot = (n: number) => n > 0 && (n & (n - 1)) === 0;
    if (pot(width) && pot(height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  resize(width: number, height: number) {
    const canvas = this.gl.canvas as HTMLCanvasElement;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
  }

  render(pose: RigPose) {
    const gl = this.gl;
    const pos = this.positions;
    pos.set(this.rest);

    const displacements: [string, number, number][] = Object.entries(pose.handles).map(([k, v]) => [k, v![0], v![1]]);
    displacements.push(['face', pose.head[0] * HEAD_RANGE.face[0], pose.head[1] * HEAD_RANGE.face[1]]);
    displacements.push(['nose', pose.head[0] * HEAD_RANGE.nose[0], pose.head[1] * HEAD_RANGE.nose[1]]);
    for (const [name, dx, dy] of displacements) {
      if (!dx && !dy) continue;
      const inf = this.influence[name];
      if (!inf) continue;
      const ux = dx / S;
      const uy = dy / S;
      for (let j = 0; j < inf.index.length; j++) {
        const i = inf.index[j] * 2;
        pos[i] += ux * inf.weight[j];
        pos[i + 1] += uy * inf.weight[j];
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);

    const [gx, gy] = pose.gaze;
    // The iris moves within the eye; the head turn moves the whole eye with it.
    gl.uniform2f(
      this.uniforms.u_gaze,
      (gx * IRIS_RANGE[0]) / S,
      (gy < 0 ? gy * IRIS_RANGE[1] : gy * IRIS_RANGE[2]) / S,
    );
    gl.uniform2f(this.uniforms.u_blink, pose.blink[0], pose.blink[1]);
    gl.uniform2f(this.uniforms.u_squint, pose.squint[0], pose.squint[1]);
    gl.uniform1f(this.uniforms.u_mouth, pose.mouth);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }

}
