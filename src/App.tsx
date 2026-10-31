import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatDock } from './components/Chat/ChatDock';
import { Nav } from './components/Nav/Nav';
import { navItems } from './config/nav';
import { site } from './config/site';
import { useInView } from './hooks/useInView';
import { typingMs } from './lib/typing';
import { About } from './sections/About';
import { Contact } from './sections/Contact';
import { Footer } from './sections/Footer';
import { Hero } from './sections/Hero';
import { Projects } from './sections/Projects';

const HERO_VISIBILITY = { threshold: 0.45 };
const STANDEE_VISIBILITY = { threshold: 0.6 };

/** Shown in the balloon while the AI Twin composes an answer. */
const THINKING = 'thinking...';
/** How long the avatar keeps its lips pressed after being told to hush. */
const HUSH_MS = 1500;

interface Reply {
  text: string;
  talking: boolean;
}

/** Which Memoji is on screen to do the talking: the hero head, or the full-body ones in About, Projects and Contact. */
type Speaker = 'hero' | 'about' | 'projects' | 'contact' | null;
type Scene = Exclude<Speaker, 'hero' | null>;

/** The line each scene says the first time it comes into view. */
const INTROS = {
  about: site.aboutIntro,
  projects: site.projectsIntro,
  contact: site.contactIntro,
} satisfies Record<Scene, unknown>;

export default function App() {
  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const heroVisible = useInView(heroRef, HERO_VISIBILITY);
  const aboutVisible = useInView(aboutRef, STANDEE_VISIBILITY);
  const deskVisible = useInView(deskRef, STANDEE_VISIBILITY);
  const contactVisible = useInView(contactRef, STANDEE_VISIBILITY);
  const speaker: Speaker = heroVisible
    ? 'hero'
    : aboutVisible
      ? 'about'
      : deskVisible
        ? 'projects'
        : contactVisible
          ? 'contact'
          : null;
  const speakerRef = useRef<Speaker>(speaker);
  useEffect(() => {
    speakerRef.current = speaker;
  }, [speaker]);

  const [chatBusy, setChatBusy] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const [intro, setIntro] = useState<Scene | null>(null);
  const [reply, setReply] = useState<Reply | null>(null);
  const talkTimer = useRef(0);
  // Closing the balloon silences the avatar until the next question.
  const [muted, setMuted] = useState(false);
  const [hush, setHush] = useState(false);
  const hushTimer = useRef(0);

  // Say hello once when the page opens.
  useEffect(() => {
    if (!site.greeting) return;
    const { delayMs, durationMs } = site.greeting;
    const start = window.setTimeout(() => setGreeting(true), delayMs);
    const end = window.setTimeout(() => setGreeting(false), delayMs + durationMs);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, []);

  // Each full-body Memoji says its line the first time its section comes into view.
  const introduced = useRef(new Set<Scene>());
  useEffect(() => {
    if (!speaker || speaker === 'hero') return;
    const line = INTROS[speaker];
    if (!line || introduced.current.has(speaker)) return;
    introduced.current.add(speaker);
    setIntro(speaker);
    const end = window.setTimeout(() => setIntro(null), line.durationMs);
    return () => window.clearTimeout(end);
  }, [speaker]);

  // The balloon is the chat's answer area: the avatar talks while an answer
  // types out, and the answer stays until the next question or it's closed.
  const sayReply = useCallback((text: string) => {
    window.clearTimeout(talkTimer.current);
    setReply({ text, talking: true });
    talkTimer.current = window.setTimeout(() => setReply({ text, talking: false }), typingMs(text.length));
  }, []);

  const onBusyChange = useCallback((busy: boolean) => {
    setChatBusy(busy);
    if (!busy) return;
    window.clearTimeout(talkTimer.current);
    setGreeting(false);
    setIntro(null);
    setReply(null);
    setMuted(false);
    // Asked with neither Memoji on screen: bring the hero into view to answer.
    if (!speakerRef.current) heroRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // The visitor closed the balloon: it goes, and the avatar shuts its mouth.
  const closeBubble = useCallback(() => {
    setMuted(true);
    setHush(true);
    window.clearTimeout(hushTimer.current);
    hushTimer.current = window.setTimeout(() => setHush(false), HUSH_MS);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(talkTimer.current);
      window.clearTimeout(hushTimer.current);
    },
    [],
  );

  const speaking = speaker && !muted;
  const answer = speaking && reply ? reply : null;
  const opener =
    speaker === 'hero' && greeting ? site.greeting : speaker && speaker === intro ? INTROS[intro] : null;
  const message = speaking ? (chatBusy ? THINKING : (answer?.text ?? opener?.message ?? null)) : null;

  const heroGreet = speaker === 'hero' && !muted && greeting ? site.greeting : null;
  const heroAnswer = speaker === 'hero' ? answer : null;
  const expression = hush
    ? 'hush'
    : heroAnswer?.talking
      ? 'explain'
      : (heroGreet?.expression ?? (speaker === 'hero' && chatBusy && !muted ? 'thinking' : 'neutral'));

  useEffect(() => {
    if (!message) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeBubble();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [message, closeBubble]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav items={navItems} />
      <main id="main">
        <Hero
          ref={heroRef}
          message={speaker === 'hero' ? message : null}
          expression={expression}
          onCloseBubble={closeBubble}
        />
        <About standeeRef={aboutRef} message={speaker === 'about' ? message : null} onCloseBubble={closeBubble} />
        <Projects standeeRef={deskRef} message={speaker === 'projects' ? message : null} onCloseBubble={closeBubble} />
        <Contact ref={contactRef} message={speaker === 'contact' ? message : null} onCloseBubble={closeBubble} />
      </main>
      <Footer />
      <ChatDock onBusyChange={onBusyChange} onReply={sayReply} />
    </>
  );
}
