# PhearakBoth

Personal portfolio: AI engineer.

A dark, editorial single page with a living avatar, a hello in a terminal-style speech balloon
on page load, and a chat dock for "PhearakBoth's AI Twin".

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the build
npm run lint
```

## Where things live

| Change… | Edit |
| --- | --- |
| Hero copy, greeting, About / Projects / Contact intro lines, resume link, contact links | `src/config/site.ts` |
| Memoji scenes in About and Projects (quiet / speaking poses, face landmarks) | `src/components/Standee/scenes.ts`, images from `scripts/prepare-images.mjs` (sources in `source-images/`) |
| Contact scene (quiet / speaking poses, social links on the laptop screen) | `src/sections/Contact.tsx`, image from `scripts/prepare-images.mjs` |
| Nav items | `src/config/nav.ts` |
| Favicon / home-screen icon | `public/favicon-*.png`, from `scripts/build-favicon.mjs` |
| What each facial expression does | `src/components/Avatar/expressions2d.ts` |
| Projects (shown on the laptop screen, `src/components/Laptop/`) | `src/data/projects.ts` |
| Avatar model, framing, gaze, blink | `src/config/avatar.ts`, see [docs/AVATAR.md](docs/AVATAR.md) |
| Chat backend | `VITE_CHAT_API_URL`, see [docs/CHAT_API.md](docs/CHAT_API.md) |

The chat links to a resume once `resumeUrl` is set (e.g. put `resume.pdf` in `public/` and set
`resumeUrl: '/resume.pdf'`).

## Stack

Vite, React 19, TypeScript, CSS Modules. three.js + React Three Fiber are loaded lazily,
and only when a `.glb` avatar exists.
