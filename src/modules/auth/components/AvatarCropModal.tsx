import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/dialog';
import { Button } from '../../../shared/components/ui/button';
import { cropImageToBlob, type CroppedAreaPixels } from '../utils/crop-image';

interface AvatarCropModalProps {
  imageSrc: string;
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

/** 1:1 crop + zoom + preview shown after picking a file that the browser can actually decode
 * (JPEG/PNG/WEBP — see ProfilePictureUpload's preview-load check). The server re-crops/re-sizes
 * regardless, so this step is purely about letting the user choose *which* part of the photo
 * becomes their avatar, not the final source of truth for size or format. */
export function AvatarCropModal({ imageSrc, open, busy, onCancel, onConfirm }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPx: Area) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setExporting(true);
    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && !exporting && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust your photo</DialogTitle>
          <DialogDescription>Drag to reposition and use the slider to zoom. Your photo is cropped to a square.</DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black/80 sm:h-80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-[var(--muted-foreground)]">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full"
            aria-label="Zoom"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy || exporting}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} loading={busy || exporting} disabled={busy || exporting || !croppedAreaPixels}>
            Use photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
