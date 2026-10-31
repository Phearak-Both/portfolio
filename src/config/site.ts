import type { Expression } from './expressions';

/**
 * Brand, hero copy and outbound links.
 * Anything left as `null` renders as a clearly-labelled placeholder.
 */
export const site = {
  brand: 'PhearakBoth',
  role: 'AI / ML Engineer in the making',
  tagline: 'Building intelligent systems. Making them useful.',

  /** What the avatar says when the homepage opens. Set to null to skip. */
  greeting: {
    message: "Hi, I'm PhearakBoth! 👋",
    expression: 'greet',
    /** Starts after the avatar has faded in; lasts this long unless the visitor uses the menu. */
    delayMs: 1000,
    durationMs: 4000,
  } as { message: string; expression: Expression; delayMs: number; durationMs: number } | null,

  /** What the full-body Memoji says the first time the About section comes into view. Set to null to skip. */
  aboutIntro: {
    message: 'Full-body render loaded. Still debugging the legs. 🦵',
    durationMs: 4500,
  } as { message: string; durationMs: number } | null,

  /** What the Memoji at his desk says the first time the Projects section comes into view. Set to null to skip. */
  projectsIntro: {
    message: 'Yes, it works on my machine. Next question. 😭',
    durationMs: 4500,
  } as { message: string; durationMs: number } | null,

  /** What the Memoji says, turning round from his laptop, the first time Contact comes into view. Set to null to skip. */
  contactIntro: {
    message: 'Oh, hey! My socials are on the screen. 👉',
    durationMs: 4500,
  } as { message: string; durationMs: number } | null,

  /** Public URL of your resume PDF, e.g. '/resume.pdf' (put the file in /public). */
  resumeUrl: null as string | null,

  contact: {
    email: null as string | null,
    github: 'https://github.com/Phearak-Both' as string | null,
    linkedin: 'https://www.linkedin.com/in/phearakboth-pheng' as string | null,
  },
};
