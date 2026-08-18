import { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
  /** Profile-picture-management contexts only (e.g. the account settings page) — every other
   * consumer keeps using sm/md/lg exactly as before. */
  xl: 'h-20 w-20 text-2xl',
} as const;

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

export interface AvatarProps {
  /** Full display name (e.g. "Ada Lovelace") or a single token (e.g. an email) — initials are derived from it. */
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Avatar({ name, imageUrl, size = 'md', className }: AvatarProps) {
  // A signed avatar URL can go stale (TTL expiry) or point at a since-deleted object — resetting
  // this whenever the URL itself changes means a fresh upload's new URL always gets a real attempt,
  // it isn't permanently stuck showing initials because a *previous* URL once failed to load.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [imageUrl]);

  if (imageUrl && !broken) {
    return (
      <img
        src={imageUrl}
        alt={name}
        onError={() => setBroken(true)}
        // A table page can render 20+ of these at once — lazy avoids fetching every offscreen row's
        // avatar upfront (browsers still load an already-in-viewport image, like the header's,
        // eagerly regardless), and async decode keeps that decode work off the main thread.
        loading="lazy"
        decoding="async"
        className={cn('shrink-0 rounded-full border border-[var(--border)] object-cover', SIZE_CLASSES[size], className)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--muted)] font-bold text-[var(--foreground)]',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {initialsFrom(name)}
    </div>
  );
}
