import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { site } from '../../config/site';
import { chatService } from '../../services/chat';
import { useChat } from './useChat';
import styles from './ChatDock.module.css';

const GREETING =
  chatService.mode === 'mock'
    ? `Hi, I'm ${site.brand}'s AI Twin. Heads up: I'm a demo for now, answering only from what's on this site. The real one, with retrieval over my notes, is on the way.`
    : `Hi, I'm ${site.brand}'s AI Twin. Ask me anything about my work.`;

/** Keeps the dock above the on-screen keyboard on mobile. */
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb-inset', `${inset}px`);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
}

interface ChatDockProps {
  /** True while the AI Twin is composing a reply. */
  onBusyChange?: (busy: boolean) => void;
  /** Each new answer from the AI Twin. The avatar's balloon is where answers are shown. */
  onReply?: (text: string) => void;
}

/** The question bar. Answers appear in the avatar's speech balloon, not here. */
export function ChatDock({ onBusyChange, onReply }: ChatDockProps) {
  const { messages, status, send, retry } = useChat(chatService, GREETING);
  const [draft, setDraft] = useState('');
  const inputId = useId();

  useKeyboardInset();

  useEffect(() => onBusyChange?.(status === 'loading'), [status, onBusyChange]);

  // Pass on answers, but not the opening greeting (kept as conversation context).
  const lastReply = useRef(messages[messages.length - 1]?.id);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role !== 'assistant' || last.id === lastReply.current) return;
    lastReply.current = last.id;
    onReply?.(last.content);
  }, [messages, onReply]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    send(draft);
    setDraft('');
  };

  return (
    <aside className={styles.dock} aria-label="AI Twin chat">
      <div className={styles.shell}>
        <div className={styles.header}>
          <label htmlFor={inputId} className={styles.title}>
            Chat with {site.brand}&rsquo;s AI Twin
            {chatService.mode === 'mock' && <span className={styles.badge}>demo</span>}
          </label>
          {status === 'error' && (
            <div className={styles.error} role="alert">
              Couldn&rsquo;t reach the AI Twin.
              <button type="button" onClick={retry}>
                Try again
              </button>
            </div>
          )}
        </div>

        <form className={styles.form} onSubmit={submit}>
          <input
            id={inputId}
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask me about my projects, experience, or technical decisions..."
            autoComplete="off"
            enterKeyHint="send"
            maxLength={500}
          />
          <button
            type="submit"
            className={styles.send}
            disabled={!draft.trim() || status === 'loading'}
            aria-label="Send message"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 16V4M4.5 9.5 10 4l5.5 5.5" />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}
