# Avatar integration

The avatar lives in `src/components/Avatar/`. Page layout only renders `<Avatar />`;
everything about how it draws is isolated there.

| File | Role |
| --- | --- |
| `Avatar.tsx` | Chooses 3D or 2D. Uses 3D only if `modelUrl` is set, the file exists, and WebGL works. Any load error falls back to 2D. |
| `Avatar3D.tsx` | Lazy-loaded React Three Fiber scene: lighting, model, gaze, idle, blink. three.js is only downloaded on this path. |
| `rig.ts` | Inspects the loaded model and reports what it actually supports. Animation only drives what's found. |
| `Avatar2D.tsx` | The rigged 2D Memoji: runs the gaze/blink/expression loop and shows the still image if WebGL is unavailable. |
| `FaceRig2D.ts` | Plain-WebGL face rig for the 2D image (mesh warp + eye shader). |
| `faceRig.json` | Hand-traced landmarks of the hero Memoji (`source-images/memoji/hero.png`, in 1024 px space): eye openings, irises, warp handles. |
| `expressions2d.ts` | What each expression does to the 2D rig. |
| `src/config/avatar.ts` | Model path, transform, camera, gaze limits, idle timing, bone/morph names. |

## Current state: the 2D face rig

There is no 3D model yet, so the site uses a **2D face rig** built on the Memoji image:

- **Eyes follow the cursor.** The irises were painted out of the eye whites
  (`src/assets/memoji/hero-eyes.png`) and are re-drawn by the shader at an offset, clipped to
  the traced eye openings.
- **Blinking and winking.** Eyelids are drawn over the openings (with a lash line that
  travels down) every few seconds and whenever the expression changes.
- **Expressions.** The image sits on a 96×96 mesh, and soft handles move the brows, mouth
  corners and cheeks. A lower-lid raise gives the smile its squint. Presets:
  `neutral`, `smile`, `greet` (talking hello), `explain` (talks while a chat answer types out), `hush` (lips pressed shut when the balloon is closed), `smirk`, `surprised`, `worried`, `thinking`,
  `salute` (smile + wink).
- **Talking.** Presets with `talk: <seconds>` move the mouth at a syllable rhythm: the
  jaw and lower lip drop and the shader draws the mouth opening along the lip line
  (`mouth` in `faceRig.json`). The `greet` preset talks while saying hello on page load.
- **Head turn.** The face shifts slightly toward the cursor, and the nose a bit more, for
  depth.

The greeting's expression is set in `src/config/site.ts`, and the avatar looks
`thinking` while the chat is answering. To tune a face, edit `expressions2d.ts`. Values
are pixels in the 1024 px source image; negative y is up.

**If you replace the hero image**, the landmarks in `faceRig.json` must be re-traced for
the new image, and both assets regenerated (see the end of this file). The rig is only
as accurate as those traced points.

Limits of a 2D rig: the mouth only opens a little (the opening is drawn, and there are no
teeth or tongue), and big head turns aren't possible. Those need the 3D model.

## Adding your model

1. Export a `.glb` and save it as `public/models/avatar.glb` (or change `modelUrl`).
2. Run `npm run dev` and open the browser console. Expand **[avatar] model inspection**:
   it lists the detected capabilities, the nodes and morph targets it matched, and every
   node and morph name in the file.
3. If something wasn't matched, add your model's names to `rig` in `src/config/avatar.ts`.
4. Adjust `scale`, `position`, `rotation` and `camera` until head and shoulders are
   framed like the 2D version.
5. If the eyes look away from the cursor, flip `yawSign` / `pitchSign` in `gaze.eyeAxes`.
   If they nod instead of turning, swap `yaw` / `pitch`. Do the same for `gaze.headAxes`.
6. The speech balloon position is tuned to the 2D framing (`.bubble` in
   `src/sections/Hero.module.css`). Re-check it after reframing.

## What the model needs

Each feature is enabled only if the model provides it:

| Feature | Requirement |
| --- | --- |
| Eye tracking (preferred) | Separate eye meshes parented to **eye bones or nodes** named `LeftEye` / `RightEye` (or names you add), pivoting at the eyeball centre. |
| Eye tracking (alternative) | ARKit morph targets `eyeLookInLeft`, `eyeLookOutLeft`, `eyeLookUpLeft`, `eyeLookDownLeft` and the `Right` equivalents. Used only if there are no eye bones. |
| Blinking | Morph targets `eyeBlinkLeft` / `eyeBlinkRight` (or a single `blink`). Without them the avatar does not blink. |
| Head turn | A `Head` bone or node. Without one, the whole model turns slightly instead. |
| Idle float / breathing | Always available (applied to the model root). |
| Expressions | `mouthSmile*` morphs are driven for `smile` / `salute` / `smirk`. Map more presets in `Avatar3D.tsx` as your model's morphs allow. |

Other guidelines:

- glTF 2.0 binary (`.glb`), Y-up, facing +Z (toward the camera), real-world scale (~1.7 m tall
  or a head-and-shoulders bust).
- PBR materials. Keep textures at 1024–2048 px and the file ideally under ~5 MB.
- Meshopt compression is supported (`gltfpack -cc`). Draco/KTX2 would need extra decoders
  in `Avatar3D.tsx`.
- Sensible routes: sculpt or kitbash in Blender using the Memoji as reference and add ARKit's
  52 shape keys, or start from any avatar generator that exports ARKit blendshapes and
  restyle it.

## Regenerating the 2D assets

Images are kept in two places:

| Folder | What's in it |
| --- | --- |
| `source-images/memoji/` | Original background-removed 4K PNGs: `hero`, and `about`, `projects`, `contact` each as `-idle` / `-speaking`. |
| `source-images/props/` | Other source art (`laptop.png`). |
| `src/assets/memoji/`, `src/assets/props/` | The web-ready WebP/PNG files the site imports, generated from the sources with the same names. |

The sources line up exactly with the images the landmarks were traced on (the hero and About /
Projects at 5×, Contact at 9.6×), so `faceRig.json` (1024 px space), `Standee/scenes.ts`
(5120 px space) and `Contact.tsx` (600×480 space) fit them.

```sh
npm i --no-save sharp
# Hero cut-out:
node scripts/prepare-images.mjs --width=2048 source-images/memoji/hero.png:src/assets/memoji/hero.webp
# Eye whites without irises, plus the opening mask (reads faceRig.json):
node scripts/build-face-rig.mjs source-images/memoji/hero.png src/assets/memoji/hero-eyes.png
# Scenes. --crop gives each About / Projects pose pair one shared crop, so they line up when
# swapped. If a crop changes, update it in Standee/scenes.ts:
node scripts/prepare-images.mjs --crop --width=840 source-images/memoji/about-idle.png:src/assets/memoji/about-idle.webp source-images/memoji/about-speaking.png:src/assets/memoji/about-speaking.webp
node scripts/prepare-images.mjs --crop --width=1600 source-images/memoji/projects-idle.png:src/assets/memoji/projects-idle.webp source-images/memoji/projects-speaking.png:src/assets/memoji/projects-speaking.webp
node scripts/prepare-images.mjs --width=1920 --height=1536 source-images/memoji/contact-idle.png:src/assets/memoji/contact-idle.webp source-images/memoji/contact-speaking.png:src/assets/memoji/contact-speaking.webp
# The laptop on the Projects page:
node scripts/prepare-images.mjs --crop --width=1600 source-images/props/laptop.png:src/assets/props/laptop.webp
# Favicons from the hero cut-out:
node scripts/build-favicon.mjs src/assets/memoji/hero.webp public
```
