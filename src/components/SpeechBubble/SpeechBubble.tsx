import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { TYPE_TICK_MS, typingStep } from '../../lib/typing';
import styles from './SpeechBubble.module.css';

interface SpeechBubbleProps {
  /** The current line, or null to hide. */
  message: string | null;
  /** Which side of the balloon the tail leaves from. */
  tail?: 'left' | 'right';
  /** Where the tail's tip sits, as a fraction of the width from the tail's side. */
  tailTip?: number;
  /** Shows a close button. */
  onClose?: () => void;
  className?: string;
}

const EMOJI = /\p{Extended_Pictographic}/u;

/**
 * Splits text into user-perceived characters, so emoji stay whole. A space
 * before an emoji becomes non-breaking, so the emoji never wraps alone.
 */
function graphemes(text: string): string[] {
  const chars =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment)
      : Array.from(text);
  return chars.map((ch, i) => (ch === ' ' && EMOJI.test(chars[i + 1] ?? '') ? '\u00a0' : ch));
}

interface Char {
  ch: string;
  /** Index in the whole text, so typing progress maps straight onto it. */
  i: number;
  /** Part of a bullet's label ("• Title:"), set in bold. */
  label?: boolean;
}

interface Line {
  chars: Char[];
  bullet: boolean;
}

/** Splits text into lines for layout: blank lines become gaps, "•" lines get a hanging indent. */
function toLines(chars: string[]): Line[] {
  const lines: Line[] = [{ chars: [], bullet: false }];
  chars.forEach((ch, i) => {
    if (ch === '\n') lines.push({ chars: [], bullet: false });
    else lines[lines.length - 1].chars.push({ ch, i });
  });
  for (const line of lines) {
    const text = line.chars.map((c) => c.ch).join('');
    line.bullet = /^[•\-*] /.test(text);
    const colon = text.indexOf(': ');
    if (line.bullet && colon > 0 && colon < 48) line.chars.slice(2, colon + 1).forEach((c) => (c.label = true));
  }
  return lines;
}

/**
 * Panel outline with chamfered corners and an angular tail, in pixels for a
 * `w` × `h` box. Drawn at the real size so the tail keeps its shape however
 * tall the text gets. `tip` is where the tail points, as a fraction of the width.
 */
function outline(w: number, h: number, tip: number): string {
  const s = 0.5;
  const c = w * 0.037;
  const bottom = h - w * 0.08 - s;
  return [
    `M${c + s} ${s} H${w - c - s} L${w - s} ${c + s} V${bottom - c} L${w - c - s} ${bottom}`,
    `H${w * (tip + 0.14)} L${w * tip} ${h - s} L${w * (tip + 0.054)} ${bottom}`,
    `H${c + s} L${s} ${bottom - c} V${c + s} Z`,
  ].join(' ');
}

/**
 * A speech balloon styled as a small terminal window: chamfered panel and
 * angular tail drawn as one SVG path (so the outline has no seam), and a
 * prompt line. Each line types itself out; the full text is laid
 * out up front (untyped characters are invisible) so the balloon never
 * reflows mid-line. Past `--lines` lines the text scrolls: it follows the
 * caret like a terminal until the visitor scrolls it themselves.
 */
export function SpeechBubble({ message, tail = 'left', tailTip = 0.113, onClose, className }: SpeechBubbleProps) {
  const reducedMotion = usePrefersReducedMotion();

  // Keep showing the last line while the balloon fades out.
  const [lastMessage, setLastMessage] = useState(message);
  const [typed, setTyped] = useState(0);
  if (message && message !== lastMessage) {
    setLastMessage(message);
    setTyped(0);
  }
  const text = message ?? lastMessage ?? '';
  const chars = useMemo(() => graphemes(text), [text]);
  const done = reducedMotion || typed >= chars.length;

  useEffect(() => {
    if (!message || reducedMotion) return;
    const step = typingStep(chars.length);
    const timer = window.setInterval(() => {
      setTyped((n) => {
        if (n + step >= chars.length) window.clearInterval(timer);
        return n + step;
      });
    }, TYPE_TICK_MS);
    return () => window.clearInterval(timer);
  }, [message, chars, reducedMotion]);

  const visible = done ? chars.length : Math.min(typed, chars.length);
  const lines = useMemo(() => toLines(chars), [chars]);
  // The caret sits after the last typed character that is drawn (line breaks aren't).
  let caretAt = visible - 1;
  while (caretAt > 0 && chars[caretAt] === '\n') caretAt--;

  const boxRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number] | null>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => setSize([box.offsetWidth, box.offsetHeight]));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Keep the caret's line in view, unless the visitor has taken over scrolling.
  const following = useRef({ text, on: true });
  useEffect(() => {
    if (following.current.text !== text) following.current = { text, on: true };
    const screen = screenRef.current;
    const caret = screen?.querySelector<HTMLElement>('[data-caret]');
    if (!screen || !caret || !following.current.on) return;
    const line = parseFloat(getComputedStyle(screen).lineHeight) || 0;
    const target = caret.offsetTop + line - screen.clientHeight;
    if (target > screen.scrollTop) screen.scrollTop = target;
  }, [visible, text]);

  const takeOver = () => (following.current.on = false);
  const onScroll = () => {
    const screen = screenRef.current;
    screen?.toggleAttribute('data-scrolled', screen.scrollTop > 0);
  };

  const renderChar = ({ ch, i, label }: Char) => (
    <span
      key={i}
      className={ch === '👋' ? styles.wave : label ? styles.label : undefined}
      data-hidden={i >= visible || undefined}
    >
      {ch}
      {i === caretAt && <span className={styles.caret} data-caret data-idle={done || undefined} />}
    </span>
  );

  return (
    <div
      ref={boxRef}
      className={[styles.bubble, className].filter(Boolean).join(' ')}
      data-visible={message ? true : undefined}
      data-tail={tail}
      data-closable={onClose ? true : undefined}
    >
      {size && (
        <svg className={styles.shape} viewBox={`0 0 ${size[0]} ${size[1]}`} aria-hidden="true">
          <path d={outline(size[0], size[1], tailTip)} />
        </svg>
      )}
      <div key={text} className={styles.text} aria-hidden="true">
        <div
          ref={screenRef}
          className={styles.screen}
          onScroll={onScroll}
          onWheel={takeOver}
          onTouchStart={takeOver}
          onPointerDown={takeOver}
        >
          {lines.map((line, n) =>
            line.chars.length === 0 ? (
              <div key={n} className={styles.gap} />
            ) : (
              <div key={n} className={line.bullet ? styles.bullet : undefined}>
                {n === 0 && <span className={styles.prompt}>&gt;</span>}
                {line.bullet ? (
                  <>
                    <span className={styles.marker}>{line.chars.slice(0, 2).map(renderChar)}</span>
                    {line.chars.slice(2).map(renderChar)}
                  </>
                ) : (
                  line.chars.map(renderChar)
                )}
              </div>
            ),
          )}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close speech bubble"
          tabIndex={message ? 0 : -1}
          aria-hidden={message ? undefined : true}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" />
          </svg>
        </button>
      )}
      <span role="status" className="visually-hidden">
        {message ?? ''}
      </span>
    </div>
  );
}
