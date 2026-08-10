import { cn } from '../../utils/cn';

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
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
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
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
