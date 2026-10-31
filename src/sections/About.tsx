import type { Ref } from 'react';
import { Reveal } from '../components/Reveal/Reveal';
import { Standee } from '../components/Standee/Standee';
import { aboutScene } from '../components/Standee/scenes';
import { site } from '../config/site';
import { useMediaQuery } from '../hooks/useMediaQuery';
import styles from './About.module.css';
import s from './Section.module.css';

const focusAreas = ['Computer vision', 'Applied machine learning', 'MLOps workflows', 'Khmer-first products'];

interface AboutProps {
  /** The standing Memoji, so the page knows when he's on screen to speak. */
  standeeRef?: Ref<HTMLDivElement>;
  message: string | null;
  onCloseBubble?: () => void;
}

/** He stands at a chalkboard, and the section is the lesson written on it. */
export function About({ standeeRef, message, onCloseBubble }: AboutProps) {
  // On phones he stands at the right edge, so his balloon opens to the left.
  const phone = useMediaQuery('(max-width: 760px)');

  return (
    <section id="about" className={s.section} aria-labelledby="about-title">
      <div className={`${s.inner} ${styles.layout}`}>
        <Reveal className={styles.side}>
          <Standee
            ref={standeeRef}
            scene={aboutScene}
            tail={phone ? 'right' : 'left'}
            message={message}
            onCloseBubble={onCloseBubble}
          />
        </Reveal>

        <Reveal className={styles.board} delay={80}>
          <div className={styles.chalk}>
            <span className={styles.index}>01 — about</span>
            <h2 id="about-title" className={styles.title}>
              Models are fun. <em>Useful is the point.</em>
            </h2>

            <div className={styles.columns}>
              <div>
                <p className={styles.lead}>
                  I&rsquo;m {site.brand}, an aspiring AI/ML engineer. I care less about models that only live in
                  notebooks and more about intelligent systems people can actually use.
                </p>
                <p className={styles.text}>
                  Right now that means computer-vision tooling, a financial assistant built for Cambodian small
                  businesses, and a steady stream of experiments to get the fundamentals right.
                </p>
                <p className={styles.text}>
                  This site is a work in progress too. The avatar up top is getting a proper 3D upgrade, and the AI
                  Twin below will soon answer from a knowledge base of my own work.
                </p>
              </div>

              <div>
                <h3 className={styles.listTitle}>working_on[]</h3>
                <ul className={styles.areas}>
                  {focusAreas.map((a, i) => (
                    <li key={a}>
                      <span className={styles.n} aria-hidden="true">
                        {String(i).padStart(2, '0')}
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
