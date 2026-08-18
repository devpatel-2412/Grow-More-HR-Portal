export function ProjectProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--muted)]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-9 shrink-0 text-[10px] text-[var(--muted-foreground)]">{clamped}%</span>
    </div>
  );
}
