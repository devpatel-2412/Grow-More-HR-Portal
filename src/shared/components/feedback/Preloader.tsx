import { useEffect, useRef, useState } from 'react';
import preloaderVideo from '../../../assets/Enhance_the_video_quality_k.mp4';
import { cn } from '../../utils/cn';

const SESSION_KEY = 'business-os-preloader-shown';
const FADE_MS = 450;
const MAX_WAIT_MS = 8000;

function shouldShow(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.sessionStorage.getItem(SESSION_KEY) === '1') return false;
  return true;
}

/**
 * One-time, full-screen brand video splash — shown once per browser session (sessionStorage-gated)
 * and skipped entirely under prefers-reduced-motion. Overlays the app rather than gating its mount,
 * so the router/providers underneath load in parallel and are ready the moment the video ends.
 */
export function Preloader() {
  const [mounted, setMounted] = useState(shouldShow);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!mounted) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = 'hidden';

    function finish() {
      window.sessionStorage.setItem(SESSION_KEY, '1');
      setLeaving(true);
      window.setTimeout(() => setMounted(false), FADE_MS);
    }

    const maxWait = window.setTimeout(finish, MAX_WAIT_MS);
    const video = videoRef.current;
    video?.addEventListener('ended', finish);
    video?.addEventListener('error', finish);

    return () => {
      document.body.style.overflow = '';
      window.clearTimeout(maxWait);
      video?.removeEventListener('ended', finish);
      video?.removeEventListener('error', finish);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn('fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--background)] transition-opacity ease-out')}
      style={{ transitionDuration: `${FADE_MS}ms`, opacity: visible && !leaving ? 1 : 0 }}
    >
      <video
        ref={videoRef}
        src={preloaderVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        className="h-full w-full object-cover"
      />
    </div>
  );
}
