import { site } from '../config/site';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span>
        © {new Date().getFullYear()} {site.brand}
      </span>
      <span>built with react, webgl &amp; a lot of debugging</span>
    </footer>
  );
}
