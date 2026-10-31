import type { Ref } from 'react';
import { Laptop } from '../components/Laptop/Laptop';
import { Reveal } from '../components/Reveal/Reveal';
import { Standee } from '../components/Standee/Standee';
import { deskScene } from '../components/Standee/scenes';
import { projects } from '../data/projects';
import s from './Section.module.css';
import styles from './Projects.module.css';

interface ProjectsProps {
  /** The Memoji at his desk, so the page knows when he's on screen to speak. */
  standeeRef?: Ref<HTMLDivElement>;
  message: string | null;
  onCloseBubble?: () => void;
}

export function Projects({ standeeRef, message, onCloseBubble }: ProjectsProps) {
  return (
    <section id="projects" className={s.section} aria-labelledby="projects-title">
      <div className={s.inner}>
        <div className={styles.top}>
          <div className={styles.main}>
            <Reveal className={styles.head}>
              <span className={s.index}>02 — projects</span>
              <h2 id="projects-title" className={s.title}>
                Things I&rsquo;ve built <em>(and debugged)</em>
              </h2>
            </Reveal>

            <Reveal delay={80}>
              <Laptop projects={projects} />
            </Reveal>
          </div>

          <Reveal className={styles.side}>
            <Standee ref={standeeRef} scene={deskScene} tail="right" message={message} onCloseBubble={onCloseBubble} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
