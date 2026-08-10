import { cn } from '../../utils/cn';

export interface DonutSegment {
  label: string;
  value: number;
  /** A CSS custom-property name, e.g. '--primary' — never a Tailwind color class (those can't be dynamically composed under Tailwind v4's static @theme extraction). */
  colorVar: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
  className?: string;
}

const STROKE_WIDTH = 12;

/** A dependency-free ring chart, fed only by real data the caller already has in hand. */
export function DonutChart({ segments, centerLabel, centerValue, size = 160, className }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div className={cn('flex flex-col items-center gap-4 sm:flex-row sm:items-center', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={STROKE_WIDTH} />
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((segment) => {
                const fraction = segment.value / total;
                const dash = fraction * circumference;
                const offset = -cumulative * circumference;
                cumulative += fraction;
                return (
                  <circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={`var(${segment.colorVar})`}
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={offset}
                    strokeLinecap="butt"
                  />
                );
              })}
        </svg>
        {(centerLabel || centerValue !== undefined) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue !== undefined && <span className="text-xl font-extrabold tabular-nums text-[var(--foreground)]">{centerValue}</span>}
            {centerLabel && <span className="text-[10px] font-medium text-[var(--muted-foreground)]">{centerLabel}</span>}
          </div>
        )}
      </div>

      {/* Real DOM legend — the data has a text alternative, not just an SVG. */}
      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-[var(--muted-foreground)]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(${segment.colorVar})` }} aria-hidden="true" />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-[var(--foreground)]">
              {total > 0 ? `${segment.value} (${Math.round((segment.value / total) * 100)}%)` : segment.value}
            </span>
          </li>
        ))}
        {total === 0 && <li className="text-xs text-[var(--muted-foreground)]">No data yet.</li>}
      </ul>
    </div>
  );
}
