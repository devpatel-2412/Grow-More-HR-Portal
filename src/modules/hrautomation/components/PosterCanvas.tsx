import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '../../../shared/utils/cn';

export interface PosterCanvasField {
  id: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  /** Live text to display — the raw `{{variableKey}}` placeholder in the editor, the resolved value in a read-only preview. */
  text: string;
}

interface PosterCanvasProps {
  backgroundUrl: string;
  fields: PosterCanvasField[];
  /** Positions are stored in the background image's natural pixel coordinates, independent of how large the canvas renders on screen. */
  maxDisplayWidth?: number;
  editable?: boolean;
  selectedFieldId?: string | null;
  onSelectField?: (id: string) => void;
  onFieldMove?: (id: string, x: number, y: number) => void;
}

/**
 * Renders a poster background with positioned text fields — the one visual surface shared by
 * the template editor (draggable), the generated-document preview (read-only), and PNG export
 * (via toCanvasDataUrl below, rasterized at the image's natural resolution so it matches
 * whatever scale the editor happened to display at).
 */
export function PosterCanvas({
  backgroundUrl,
  fields,
  maxDisplayWidth = 480,
  editable = false,
  selectedFieldId,
  onSelectField,
  onFieldMove,
}: PosterCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const scale = naturalSize ? Math.min(1, maxDisplayWidth / naturalSize.width) : 1;

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    setNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight });
  }

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging || !containerRef.current || !naturalSize) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(naturalSize.width, (e.clientX - rect.left) / scale));
      const y = Math.max(0, Math.min(naturalSize.height, (e.clientY - rect.top) / scale));
      onFieldMove?.(dragging, Math.round(x), Math.round(y));
    },
    [dragging, naturalSize, scale, onFieldMove],
  );

  useEffect(() => {
    if (!dragging) return;
    function onUp() {
      setDragging(null);
    }
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, handlePointerMove]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]"
      style={naturalSize ? { width: naturalSize.width * scale, height: naturalSize.height * scale } : undefined}
    >
      {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative poster background, the text fields carry the real content */}
      <img src={backgroundUrl} onLoad={handleImageLoad} className="absolute inset-0 h-full w-full object-cover" draggable={false} alt="" />
      {fields.map((field) => (
        <div
          key={field.id}
          role={editable ? 'button' : undefined}
          tabIndex={editable ? 0 : undefined}
          aria-label={editable ? `${field.text} — drag, or use arrow keys, to reposition` : undefined}
          onPointerDown={editable ? () => setDragging(field.id) : undefined}
          onClick={editable ? () => onSelectField?.(field.id) : undefined}
          onKeyDown={
            editable
              ? (e) => {
                  const step = e.shiftKey ? 10 : 1;
                  const deltas: Record<string, [number, number]> = {
                    ArrowUp: [0, -step],
                    ArrowDown: [0, step],
                    ArrowLeft: [-step, 0],
                    ArrowRight: [step, 0],
                  };
                  const delta = deltas[e.key];
                  if (!delta || !naturalSize) return;
                  e.preventDefault();
                  onSelectField?.(field.id);
                  const nextX = Math.max(0, Math.min(naturalSize.width, field.x + delta[0]));
                  const nextY = Math.max(0, Math.min(naturalSize.height, field.y + delta[1]));
                  onFieldMove?.(field.id, nextX, nextY);
                }
              : undefined
          }
          className={cn(
            'absolute whitespace-nowrap select-none',
            editable && 'cursor-move rounded px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
            editable && selectedFieldId === field.id && 'ring-2 ring-[var(--primary)]',
          )}
          style={{
            left: field.x * scale,
            top: field.y * scale,
            fontSize: field.fontSize * scale,
            color: field.color,
            fontWeight: field.fontWeight,
          }}
        >
          {field.text}
        </div>
      ))}
    </div>
  );
}

/** Rasterizes the same background + fields at natural resolution — used for the "Download PNG" export. */
export async function renderPosterToPngDataUrl(backgroundUrl: string, fields: PosterCanvasField[]): Promise<string> {
  const image = await loadImage(backgroundUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available');

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const field of fields) {
    ctx.font = `${field.fontWeight === 'bold' ? 'bold ' : ''}${field.fontSize}px sans-serif`;
    ctx.fillStyle = field.color;
    ctx.textBaseline = 'top';
    ctx.fillText(field.text, field.x, field.y);
  }
  return canvas.toDataURL('image/png');
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the background image'));
    img.src = url;
  });
}
