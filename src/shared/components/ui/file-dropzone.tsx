import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud, X, File as FileIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface FileDropzoneProps {
  /** Fully controlled — the caller owns the pending-file list (matches how the rest of this
   * codebase's form inputs work) so it can validate, preview, and submit on its own terms. */
  files: File[];
  onFilesChange: (files: File[]) => void;
  multiple?: boolean;
  /** Passed straight through to the native file input's `accept` attribute. */
  accept?: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Drag-and-drop (or click-to-browse) multi-file picker. Client-side count/size validation only
 * — the server re-validates type and size independently and is the real source of truth. */
export function FileDropzone({ files, onFilesChange, multiple = true, accept, maxFiles = 10, maxSizeBytes, disabled, className }: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | File[]) {
    setError(null);
    const incomingArray = Array.from(incoming);
    const combined = multiple ? [...files, ...incomingArray] : incomingArray.slice(0, 1);

    if (combined.length > maxFiles) {
      setError(`You can upload up to ${maxFiles} files at once.`);
      return;
    }
    if (maxSizeBytes) {
      const tooLarge = combined.find((f) => f.size > maxSizeBytes);
      if (tooLarge) {
        setError(`"${tooLarge.name}" is larger than ${formatBytes(maxSizeBytes)}.`);
        return;
      }
    }
    onFilesChange(combined);
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragActive ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-[var(--border)] hover:border-[var(--primary)]/50',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <UploadCloud className="h-8 w-8 text-[var(--muted-foreground)]" aria-hidden="true" />
        <p className="text-sm font-semibold text-[var(--foreground)]">Drag &amp; drop {multiple ? 'files' : 'a file'} here, or click to browse</p>
        {maxSizeBytes && <p className="text-xs text-[var(--muted-foreground)]">Max {formatBytes(maxSizeBytes)} per file{multiple ? `, up to ${maxFiles} files` : ''}</p>}
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs"
            >
              <FileIcon className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
              <span className="flex-1 truncate text-[var(--foreground)]">{file.name}</span>
              <span className="shrink-0 text-[var(--muted-foreground)]">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
                className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
