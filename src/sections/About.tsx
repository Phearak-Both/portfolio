import type { Ref } from 'react';
import { Reveal } from '../components/Reveal/Reveal';
import { Standee } from '../components/Standee/Standee';
import { aboutScene } from '../components/Standee/scenes';
import { site } from '../config/site';
import s from './Section.module.css';
import styles from './About.module.css';

const focusAreas = ['Computer vision', 'Applied machine learning', 'MLOps workflows', 'Khmer-first products'];

interface AboutProps {
  /** The standing Memoji, so the page knows when he's on screen to speak. */
  standeeRef?: Ref<HTMLDivElement>;
  message: string | null;
  onCloseBubble?: () => void;
}

export function About({ standeeRef, message, onCloseBubble }: AboutProps) {
  return (
    <section id="about" className={s.section} aria-labelledby="about-title">
      <div className={`${s.inner} ${styles.layout}`}>
        <Reveal className={styles.side}>
          <Standee ref={standeeRef} scene={aboutScene} message={message} onCloseBubble={onCloseBubble} />
        </Reveal>

        <div className={styles.main}>
          <Reveal className={styles.head}>
            <span className={s.index}>01 — about</span>
            <h2 id="about-title" className={s.title}>
              Models are fun. <em>Useful is the point.</em>
            </h2>
          </Reveal>

          <div className={styles.columns}>
            <Reveal>
              <p className={s.lead}>
                I&rsquo;m {site.brand}, an aspiring AI/ML engineer. I care less about models that only live in notebooks
                and more about intelligent systems people can actually use.
              </p>
              <p className={s.text}>
                Right now that means computer-vision tooling, a financial assistant built for Cambodian small
                businesses, and a steady stream of experiments to get the fundamentals right.
              </p>
              <p className={s.text}>
                This site is a work in progress too. The avatar up top is getting a proper 3D upgrade, and the AI Twin
                below will soon answer from a knowledge base of my own work.
              </p>
            </Reveal>

            <Reveal delay={100}>
              <h3 className={s.mono}>working_on[]</h3>
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
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
