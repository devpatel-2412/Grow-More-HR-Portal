import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import { ApiError } from '../../../shared/lib/api-client';
import { Avatar } from '../../../shared/components/ui/avatar';
import { Button } from '../../../shared/components/ui/button';
import { AvatarCropModal } from './AvatarCropModal';

// Mirrors the server's authoritative check in avatar-upload.middleware.ts / avatar-image.util.ts —
// this client-side pass exists only to reject an obviously-wrong file instantly, without a round
// trip; the server never trusts these values and re-validates the actual file content itself.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'application/octet-stream', // iOS/Android often omit or mislabel a HEIC camera-roll file's type
]);
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Self-service profile picture management — rendered on the account/profile settings surface
 * (DashboardPage's "Account" card) alongside change-password and two-factor settings.
 *
 * A picked photo goes through the crop modal (1:1 crop + zoom + preview) whenever the browser can
 * actually decode it for a `<canvas>` preview. No browser reliably renders HEIC/HEIF in an `<img>`
 * or canvas, so a HEIC file (common straight off an iPhone) skips the visual crop step and uploads
 * as-is — the server (processAvatarImage) decodes it via libheif, auto-orients from EXIF, and
 * applies its own smart center-crop to the same square/512px output either way. */
export function ProfilePictureUpload() {
  const { user, profile, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('avatar.jpg');
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : (user?.email ?? '?');
  const busy = uploading || removing;

  function handleChangeClick() {
    setError(null);
    inputRef.current?.click();
  }

  function isLikelyHeic(file: File, extension: string): boolean {
    return extension === '.heic' || extension === '.heif' || /heic|heif/i.test(file.type);
  }

  async function uploadFile(file: File) {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);
    try {
      const result = await authApi.uploadAvatar(file);
      updateUser({ avatarUrl: result.avatarUrl });
      toast.success('Profile picture updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
    }
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be re-picked later (e.g. after a failed upload)
    if (!file) return;

    setError(null);
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.type) || !ALLOWED_EXTENSIONS.includes(extension)) {
      setError('Only JPG, PNG, WEBP, HEIC, and HEIF images are allowed.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Profile picture must be smaller than 5 MB.');
      return;
    }

    setPendingFileName(file.name.replace(/\.[^.]+$/, '.jpg'));

    // HEIC/HEIF can't be reliably previewed in a browser <img>/canvas, so skip the crop step and
    // send the original file straight through — the server handles the real crop for these.
    if (isLikelyHeic(file, extension)) {
      await uploadFile(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => setCropSrc(objectUrl);
    probe.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      void uploadFile(file);
    };
    probe.src = objectUrl;
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleCropConfirm(blob: Blob) {
    const croppedFile = new File([blob], pendingFileName, { type: 'image/jpeg' });
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    await uploadFile(croppedFile);
  }

  async function handleRemove() {
    if (!window.confirm('Remove your profile picture?')) return;
    setError(null);
    setRemoving(true);
    try {
      await authApi.removeAvatar();
      updateUser({ avatarUrl: null });
      toast.success('Profile picture removed.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove profile picture. Please try again.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Avatar name={displayName} imageUrl={previewUrl ?? user?.avatarUrl} size="xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleChangeClick} loading={uploading} disabled={busy}>
            {user?.avatarUrl ? 'Replace photo' : 'Change photo'}
          </Button>
          {user?.avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              loading={removing}
              disabled={busy}
              className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">Accepted formats: JPG, PNG, WEBP, HEIC, HEIF. Maximum size: 5 MB.</p>
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="sr-only"
        onChange={handleFileSelected}
        aria-label="Upload profile picture"
      />
      {cropSrc && (
        <AvatarCropModal imageSrc={cropSrc} open={!!cropSrc} busy={uploading} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}
