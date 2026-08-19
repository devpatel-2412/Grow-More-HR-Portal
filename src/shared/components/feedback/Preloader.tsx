import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import preloaderVideoDesktop from '../../../assets/Enhance_the_video_quality_k.mp4';
import preloaderVideoMobile from '../../../assets/small-screen-loader.mp4';
import { cn } from '../../utils/cn';

const SESSION_KEY = 'grow-more-preloader-shown';
const FADE_MS = 450;
const MAX_WAIT_MS = 8000;
// Same 768px cutoff Tailwind's `md` breakpoint uses elsewhere in the app (e.g. the login page's
// own banner panel) to split "mobile" from "tablet/desktop" — kept consistent so the preloader
// switches variants at the same viewport width the rest of the UI already treats as the boundary.
const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

function getPreloaderVideoSrc(): string {
  if (typeof window === 'undefined') return preloaderVideoDesktop;
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches ? preloaderVideoDesktop : preloaderVideoMobile;
}

function shouldShow(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.sessionStorage.getItem(SESSION_KEY) === '1') return false;
  // The splash is a ~2.5MB video — skip it entirely for a visitor who has explicitly asked the
  // browser to minimize data usage (Data Saver / a metered connection), rather than forcing that
  // download on them for a purely decorative asset.
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;
  return true;
}

/**
 * One-time, full-screen brand video splash — shown once per browser session (sessionStorage-gated)
 * and skipped entirely under prefers-reduced-motion. Plays a dedicated small-screen variant below
 * the 768px breakpoint and the desktop/tablet variant above it. Overlays the app rather than
 * gating its mount, so the router/providers underneath load in parallel and are ready the moment
 * the video ends.
 */
export function Preloader() {
  const [mounted, setMounted] = useState(shouldShow);
  const [leaving, setLeaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // `fetchpriority` isn't in React's VideoHTMLAttributes typings yet, and more importantly needs
  // to land on the element *before* `src` does — the browser can start fetching the instant `src`
  // is set, so setting priority afterwards (e.g. in a plain effect, or via a JSX prop React might
  // apply in either order) could lose the race. useLayoutEffect + explicit ordering guarantees
  // fetchpriority is already present when src triggers the actual request.
  useLayoutEffect(() => {
    if (!mounted) return;
    const video = videoRef.current;
    if (!video) return;
    video.setAttribute('fetchpriority', 'low');
    // Resolved once, at load time — the preloader plays once through on initial load, so there's
    // no case where the viewport changes mid-playback that would need a mid-play source swap.
    video.src = getPreloaderVideoSrc();
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
    // Opaque from the very first paint — no mount-time fade-in. A fade-in would mean opacity
    // starts at 0 and ramps up over FADE_MS, and during that ramp the page underneath (e.g. the
    // login form) is visible through the semi-transparent overlay. Only `leaving` animates, which
    // fades the overlay OUT once the video has actually finished, revealing the page beneath it.
    <div
      role="presentation"
      aria-hidden="true"
      className={cn('fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--background)] transition-opacity ease-out')}
      style={{ transitionDuration: `${FADE_MS}ms`, opacity: leaving ? 0 : 1 }}
    >
      {/* `src` and `fetchpriority` are applied imperatively above (see the useLayoutEffect) —
          not as JSX props — specifically so fetchpriority is guaranteed to be set before src
          triggers the fetch. This ~2.5MB decorative video previously downloaded at the browser's
          default priority, contending for bandwidth with the app's own critical JS/CSS during the
          exact window that determines FCP/LCP/Speed Index; deprioritizing it (Chromium; a no-op
          elsewhere) lets those critical-path resources win that contention first. */}
      <video
        ref={videoRef}
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
