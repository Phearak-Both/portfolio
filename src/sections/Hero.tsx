import type { Ref } from 'react';
import { Avatar } from '../components/Avatar/Avatar';
import { SpeechBubble } from '../components/SpeechBubble/SpeechBubble';
import type { Expression } from '../config/expressions';
import { site } from '../config/site';
import { useMediaQuery } from '../hooks/useMediaQuery';
import styles from './Hero.module.css';

interface HeroProps {
  ref?: Ref<HTMLElement>;
  message: string | null;
  expression: Expression;
  onCloseBubble?: () => void;
}

export function Hero({ ref, message, expression, onCloseBubble }: HeroProps) {
  const compact = useMediaQuery('(max-width: 900px)');

  return (
    <section ref={ref} id="home" className={styles.hero}>
      <h1 className="visually-hidden">
        {site.brand}, {site.role}
      </h1>

      {/* Role and name, large, behind his head. Decorative: the h1 above carries them. */}
      <div className={styles.intro} aria-hidden="true">
        <p className={styles.eyebrow}>{site.role}</p>
        <p className={styles.name}>{site.brand}</p>
      </div>

      <div className={styles.stage}>
        <Avatar expression={expression} />
        <SpeechBubble
          message={message}
          tail={compact ? 'right' : 'left'}
          onClose={onCloseBubble}
          className={styles.bubble}
        />
      </div>
    </section>
  );
}
