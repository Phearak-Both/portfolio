import { useEffect, useState } from 'react';
import { site } from '../../config/site';
import type { NavItem } from '../../config/nav';
import styles from './Nav.module.css';

interface NavProps {
  items: NavItem[];
}

export function Nav({ items }: NavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={styles.header} data-scrolled={scrolled || undefined}>
      <a href="#home" className={styles.brand}>
        {site.brand}
      </a>

      <nav aria-label="Primary">
        <ul className={styles.list}>
          {items.map((item, i) => (
            <li key={item.id}>
              <a href={item.href} className={styles.link}>
                <span className={styles.index} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
