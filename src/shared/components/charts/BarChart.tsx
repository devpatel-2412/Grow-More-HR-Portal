import { useState } from 'react';
import { cn } from '../../utils/cn';

export interface BarChartDatum {
  label: string;
  value: number;
  value2?: number;
}

export interface BarChartProps {
  data: BarChartDatum[];
  /** Legend labels for value/value2 — omit the second if no datum sets value2. */
  seriesLabels?: [string, string?];
  formatValue?: (value: number) => string;
  className?: string;
}

const DEFAULT_FORMAT = (value: number) => value.toLocaleString();

/** A dependency-free grouped bar chart, fed only by real data the caller already has in hand. */
export function BarChart({ data, seriesLabels = ['Value', undefined], formatValue = DEFAULT_FORMAT, className }: BarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const hasSecondSeries = data.some((d) => d.value2 !== undefined);
  const max = Math.max(1, ...data.map((d) => d.value), ...data.map((d) => d.value2 ?? 0));

  if (data.length === 0) {
    return <p className={cn('text-xs text-[var(--muted-foreground)]', className)}>No data yet.</p>;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {hasSecondSeries && (
        <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--primary)]" aria-hidden="true" />
            {seriesLabels[0]}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--secondary)]" aria-hidden="true" />
            {seriesLabels[1]}
          </span>
        </div>
      )}

      <div className="flex h-40 items-end gap-2">
        {data.map((datum, index) => {
          const description = `${datum.label}: ${seriesLabels[0]} ${formatValue(datum.value)}${
            datum.value2 !== undefined ? `, ${seriesLabels[1]} ${formatValue(datum.value2)}` : ''
          }`;
          return (
            <button
              type="button"
              key={datum.label}
              aria-label={description}
              className="relative flex h-full flex-1 items-end justify-center gap-0.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered((current) => (current === index ? null : current))}
            >
              {hovered === index && (
                <div className="surface-overlay pointer-events-none absolute -top-2 left-1/2 z-10 w-max -translate-x-1/2 -translate-y-full rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap">
                  <p className="font-semibold text-[var(--foreground)]">{datum.label}</p>
                  <p className="text-[var(--muted-foreground)]">
                    {seriesLabels[0]}: {formatValue(datum.value)}
                  </p>
                  {datum.value2 !== undefined && (
                    <p className="text-[var(--muted-foreground)]">
                      {seriesLabels[1]}: {formatValue(datum.value2)}
                    </p>
                  )}
                </div>
              )}
              <div
                className="w-full min-w-[3px] rounded-t-sm bg-[var(--primary)] transition-opacity"
                style={{ height: `${Math.max(2, (datum.value / max) * 100)}%`, opacity: hovered === null || hovered === index ? 1 : 0.4 }}
              />
              {datum.value2 !== undefined && (
                <div
                  className="w-full min-w-[3px] rounded-t-sm bg-[var(--secondary)] transition-opacity"
                  style={{ height: `${Math.max(2, (datum.value2 / max) * 100)}%`, opacity: hovered === null || hovered === index ? 1 : 0.4 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        {data.map((datum) => (
          <span key={datum.label} className="flex-1 truncate text-center text-[10px] text-[var(--muted-foreground)]">
            {datum.label}
          </span>
        ))}
      </div>
    </div>
  );
}
