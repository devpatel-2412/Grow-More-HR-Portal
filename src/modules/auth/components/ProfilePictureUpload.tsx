import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import { ApiError } from '../../../shared/lib/api-client';
import { Avatar } from '../../../shared/components/ui/avatar';
import { Button } from '../../../shared/components/ui/button';

// Mirrors the server's authoritative check in avatar-upload.middleware.ts / avatar-image.util.ts —
// this client-side pass exists only to reject an obviously-wrong file instantly, without a round
// trip; the server never trusts these values and re-validates the actual file content itself.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Self-service profile picture management — rendered on the account/profile settings surface
 * (DashboardPage's "Account" card) alongside change-password and two-factor settings. Uploads
 * happen immediately on file selection (the server crops/resizes automatically), so there's no
 * separate "Save" step; a local object-URL preview covers the gap while the request is in flight. */
export function ProfilePictureUpload() {
  const { user, profile, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : (user?.email ?? '?');
  const busy = uploading || removing;

  function handleChangeClick() {
    setError(null);
    inputRef.current?.click();
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be re-picked later (e.g. after a failed upload)
    if (!file) return;

    setError(null);
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.type) || !ALLOWED_EXTENSIONS.includes(extension)) {
      setError('Only JPG, PNG, and WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Profile picture must be smaller than 5 MB.');
      return;
    }

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
            Change photo
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
        <p className="text-xs text-[var(--muted-foreground)]">Accepted formats: JPG, PNG, WEBP. Maximum size: 5 MB.</p>
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileSelected}
        aria-label="Upload profile picture"
      />
    </div>
  );
}
