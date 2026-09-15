export interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

// Bounds the exported crop so a huge source photo (a modern phone camera easily produces
// 4000px+ on a side) doesn't turn into an oversized upload — the server re-encodes to
// AVATAR_OUTPUT_SIZE (512) anyway, so anything comfortably above that is wasted bytes.
const MAX_EXPORT_SIZE = 1024;

/** Crops `imageSrc` to the square region described by `area` (in source-image pixels, as
 * produced by react-easy-crop's onCropComplete) and returns it as a JPEG Blob. */
export async function cropImageToBlob(imageSrc: string, area: CroppedAreaPixels): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const outputSize = Math.min(MAX_EXPORT_SIZE, Math.round(area.width));

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');

  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export cropped image'))),
      'image/jpeg',
      0.92,
    );
  });
}
