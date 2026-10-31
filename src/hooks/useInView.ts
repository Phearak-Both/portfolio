import { useEffect, useState, type RefObject } from 'react';

/** Tracks whether an element intersects the viewport. */
export function useInView(ref: RefObject<Element | null>, options?: IntersectionObserverInit): boolean {
  const [inView, setInView] = useState(true);
  const { root, rootMargin, threshold } = options ?? {};

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      root,
      rootMargin,
      threshold,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, root, rootMargin, threshold]);

  return inView;
}
