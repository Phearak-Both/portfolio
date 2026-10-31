import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { avatarConfig } from '../../config/avatar';
import { trackPointer } from '../../hooks/pointer';
import { useInView } from '../../hooks/useInView';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import type { Expression } from '../../config/expressions';
import { Avatar2D } from './Avatar2D';
import styles from './Avatar.module.css';

const Avatar3D = lazy(() => import('./Avatar3D'));

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** HEAD-checks the model. Dev servers answer unknown paths with index.html, so HTML counts as missing. */
async function modelAvailable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok && !(res.headers.get('content-type') ?? '').includes('text/html');
  } catch {
    return false;
  }
}

class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[avatar] 3D model failed to load, using the 2D fallback.', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The avatar. Renders the 3D model when one is configured, present and
 * WebGL works; otherwise the rigged 2D Memoji. Layout code only uses this component.
 */
export function Avatar({ expression = 'neutral', className }: { expression?: Expression; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const inView = useInView(ref);
  const [mode, setMode] = useState<'2d' | '3d'>('2d');

  useEffect(() => trackPointer(), []);

  useEffect(() => {
    const url = avatarConfig.modelUrl;
    if (!url || !supportsWebGL()) return;
    let cancelled = false;
    modelAvailable(url).then((ok) => !cancelled && ok && setMode('3d'));
    return () => {
      cancelled = true;
    };
  }, []);

  const fallback = <Avatar2D expression={expression} reducedMotion={reducedMotion} paused={!inView} />;

  return (
    <div ref={ref} className={[styles.avatar, className].filter(Boolean).join(' ')} data-mode={mode}>
      {mode === '3d' && avatarConfig.modelUrl ? (
        <ModelErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <Avatar3D url={avatarConfig.modelUrl} expression={expression} reducedMotion={reducedMotion} paused={!inView} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
