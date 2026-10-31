import { useEffect, useRef, useState } from 'react';
import laptop from '../../assets/props/laptop.webp';
import type { Project } from '../../data/projects';
import styles from './Laptop.module.css';

/** Size of src/assets/props/laptop.webp. */
const SIZE: [number, number] = [1600, 1050];
/**
 * The black screen inside the bezel, as shares of the image (measured on
 * source-images/props/laptop.png within the crop scripts/prepare-images.mjs printed).
 */
const SCREEN = { left: 0.1457, top: 0.0284, width: 0.7217, height: 0.7176 };

const label = (i: number) => `p_${String(i + 1).padStart(2, '0')}`;

/**
 * A laptop whose screen is a tiny projects browser: a list of projects, and
 * a page for each one, opened by clicking it.
 */
export function Laptop({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState<number | null>(null);
  /** The project that was last open, so focus can go back to it in the list. */
  const last = useRef<number | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Keyboard users land where they were going: on Back when a project opens,
  // on the project they came from when they go back.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    if (open !== null) backRef.current?.focus({ preventScroll: true });
    else if (last.current !== null) itemRefs.current[last.current]?.focus({ preventScroll: true });
  }, [open]);

  const show = (i: number | null) => {
    if (i !== null) last.current = i;
    setOpen(i);
  };

  const project = open === null ? null : projects[open];

  return (
    <div className={styles.laptop} style={{ aspectRatio: `${SIZE[0]} / ${SIZE[1]}` }}>
      <img
        className={styles.photo}
        src={laptop}
        width={SIZE[0]}
        height={SIZE[1]}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <div
        className={styles.screen}
        style={{
          left: `${SCREEN.left * 100}%`,
          top: `${SCREEN.top * 100}%`,
          width: `${SCREEN.width * 100}%`,
          height: `${SCREEN.height * 100}%`,
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open !== null) show(null);
        }}
      >
        {/* A menu bar either side of the camera notch. */}
        <div className={styles.bar} aria-hidden="true">
          <span>{project ? `~/projects/${project.id}` : '~/projects'}</span>
          <span>{project ? `${label(open!)} / ${label(projects.length - 1)}` : `${projects.length} items`}</span>
        </div>

        <div ref={bodyRef} className={styles.body}>
          {project ? (
            <article key={project.id} className={styles.page} aria-labelledby={`project-${project.id}`}>
              <div className={styles.nav}>
                <button ref={backRef} type="button" className={styles.back} onClick={() => show(null)}>
                  <span aria-hidden="true">←</span> All projects
                </button>
                <span className={styles.pager}>
                  <button
                    type="button"
                    aria-label="Previous project"
                    disabled={open === 0}
                    onClick={() => show(open! - 1)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next project"
                    disabled={open === projects.length - 1}
                    onClick={() => show(open! + 1)}
                  >
                    ›
                  </button>
                </span>
              </div>

              <h3 id={`project-${project.id}`} className={styles.title}>
                {project.title}
              </h3>
              <p className={styles.summary}>{project.summary}</p>

              <ul className={styles.highlights}>
                {project.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>

              <ul className={styles.stack} aria-label="Technologies and tags">
                {project.stack.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>

              {project.links?.length ? (
                <div className={styles.links}>
                  {project.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                      {l.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          ) : (
            <ul className={styles.list} aria-label="Projects">
              {projects.map((p, i) => (
                <li key={p.id}>
                  <button
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    type="button"
                    className={styles.item}
                    onClick={() => show(i)}
                  >
                    <span className={styles.index}>{label(i)}</span>
                    <span className={styles.name}>{p.title}</span>
                    <span className={styles.blurb}>{p.summary}</span>
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
