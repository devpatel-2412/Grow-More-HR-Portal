import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import { ApiError } from '../../../shared/lib/api-client';

vi.mock('../context/AuthContext');
vi.mock('../api/auth.api');

// The real AvatarCropModal wraps react-easy-crop, which needs a genuinely decoded image and
// pointer-drag interactions to produce a crop region — not something worth simulating in jsdom.
// These tests own ProfilePictureUpload's own logic (validation, probe-then-crop-or-upload
// branching, upload wiring); the crop modal's internal cropping behavior is the library's concern.
vi.mock('./AvatarCropModal', () => ({
  AvatarCropModal: ({ open, onConfirm, onCancel }: { open: boolean; onConfirm: (blob: Blob) => void; onCancel: () => void }) =>
    open ? (
      <div>
        <button type="button" onClick={() => onConfirm(new Blob(['cropped'], { type: 'image/jpeg' }))}>
          Confirm crop
        </button>
        <button type="button" onClick={onCancel}>
          Cancel crop
        </button>
      </div>
    ) : null,
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUploadAvatar = vi.mocked(authApi.uploadAvatar);
const mockRemoveAvatar = vi.mocked(authApi.removeAvatar);

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

// Real object URLs and image decoding aren't available in jsdom — this stands in for the browser
// actually being able (or, for the "unpreviewable" test, unable) to decode the picked file.
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => (MockImage.shouldFail ? this.onerror?.() : this.onload?.()));
  }
  static shouldFail = false;
}

describe('ProfilePictureUpload', () => {
  const updateUser = vi.fn();
  const originalImage = window.Image;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    MockImage.shouldFail = false;
    (window as unknown as { Image: unknown }).Image = MockImage;
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'ada@acme.com', role: 'EMPLOYEE', status: 'ACTIVE', permissions: [], avatarUrl: null },
      profile: { id: 'p1', employeeId: 'EMP-1', firstName: 'Ada', lastName: 'Lovelace', department: 'Eng', designation: 'Engineer' },
      tenant: null,
      isLoading: false,
      isAuthenticated: true,
      setSession: vi.fn(),
      logout: vi.fn(),
      updateUser,
    } as never);
  });

  afterEach(() => {
    window.Image = originalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('shows initials when there is no profile picture yet', () => {
    render(<ProfilePictureUpload />);
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveTextContent('AL');
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('rejects an unsupported file type before ever calling the API', async () => {
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    const gif = makeFile('photo.gif', 'image/gif', 1000);

    // The input's `accept` attribute already blocks a mismatched file from being selected through
    // userEvent.upload() (mirroring real native file-picker filtering) — fireEvent.change bypasses
    // that the same way a user could via drag-and-drop or "All Files", to exercise the JS fallback
    // check that exists specifically for when the native filter isn't the one stopping a bad file.
    Object.defineProperty(input, 'files', { value: [gif], configurable: true });
    fireEvent.change(input);

    expect(await screen.findByText(/only jpg, png, webp, heic, and heif/i)).toBeInTheDocument();
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it('rejects a file larger than 5 MB before ever calling the API', async () => {
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    const tooBig = makeFile('photo.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1);

    await userEvent.upload(input, tooBig);

    expect(await screen.findByText(/must be smaller than 5 mb/i)).toBeInTheDocument();
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it('opens the crop modal for a previewable JPG, then uploads the cropped result and updates the session avatar', async () => {
    mockUploadAvatar.mockResolvedValue({ avatarUrl: 'https://signed.example/new-avatar.webp' });
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    const jpg = makeFile('photo.jpg', 'image/jpeg', 1000);

    await userEvent.upload(input, jpg);
    await userEvent.click(await screen.findByRole('button', { name: /confirm crop/i }));

    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledOnce());
    const uploaded = mockUploadAvatar.mock.calls[0][0];
    expect(uploaded.name).toBe('photo.jpg');
    expect(uploaded.type).toBe('image/jpeg');
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ avatarUrl: 'https://signed.example/new-avatar.webp' }));
  });

  it('uploads a valid PNG via the crop flow', async () => {
    mockUploadAvatar.mockResolvedValue({ avatarUrl: 'https://signed.example/new-avatar.webp' });
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    await userEvent.upload(input, makeFile('photo.png', 'image/png', 1000));
    await userEvent.click(await screen.findByRole('button', { name: /confirm crop/i }));
    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledOnce());
  });

  it('uploads a valid WEBP via the crop flow', async () => {
    mockUploadAvatar.mockResolvedValue({ avatarUrl: 'https://signed.example/new-avatar.webp' });
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    await userEvent.upload(input, makeFile('photo.webp', 'image/webp', 1000));
    await userEvent.click(await screen.findByRole('button', { name: /confirm crop/i }));
    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledOnce());
  });

  it('cancelling the crop modal does not upload anything', async () => {
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    await userEvent.upload(input, makeFile('photo.jpg', 'image/jpeg', 1000));
    await userEvent.click(await screen.findByRole('button', { name: /cancel crop/i }));

    expect(mockUploadAvatar).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /confirm crop/i })).not.toBeInTheDocument();
  });

  it('uploads a HEIC file directly, skipping the crop modal since it cannot be previewed in-browser', async () => {
    mockUploadAvatar.mockResolvedValue({ avatarUrl: 'https://signed.example/new-avatar.webp' });
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    const heic = makeFile('IMG_0001.heic', 'image/heic', 1000);

    await userEvent.upload(input, heic);

    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledWith(heic));
    expect(screen.queryByRole('button', { name: /confirm crop/i })).not.toBeInTheDocument();
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ avatarUrl: 'https://signed.example/new-avatar.webp' }));
  });

  it('falls back to direct upload when the browser cannot decode the picked file for a preview', async () => {
    MockImage.shouldFail = true;
    mockUploadAvatar.mockResolvedValue({ avatarUrl: 'https://signed.example/new-avatar.webp' });
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    const jpg = makeFile('photo.jpg', 'image/jpeg', 1000);

    await userEvent.upload(input, jpg);

    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledWith(jpg));
    expect(screen.queryByRole('button', { name: /confirm crop/i })).not.toBeInTheDocument();
  });

  it('shows a server-side validation error message when the upload is rejected', async () => {
    mockUploadAvatar.mockRejectedValue(new ApiError(400, 'BAD_REQUEST', 'The uploaded file is not a valid image.'));
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    await userEvent.upload(input, makeFile('photo.jpg', 'image/jpeg', 1000));
    await userEvent.click(await screen.findByRole('button', { name: /confirm crop/i }));

    expect(await screen.findByText('The uploaded file is not a valid image.')).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('removes the profile picture after confirming, and clears the session avatar', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'ada@acme.com', role: 'EMPLOYEE', status: 'ACTIVE', permissions: [], avatarUrl: 'https://signed.example/current.webp' },
      profile: { id: 'p1', employeeId: 'EMP-1', firstName: 'Ada', lastName: 'Lovelace', department: 'Eng', designation: 'Engineer' },
      tenant: null,
      isLoading: false,
      isAuthenticated: true,
      setSession: vi.fn(),
      logout: vi.fn(),
      updateUser,
    } as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockRemoveAvatar.mockResolvedValue(undefined);

    render(<ProfilePictureUpload />);
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => expect(mockRemoveAvatar).toHaveBeenCalledOnce());
    expect(updateUser).toHaveBeenCalledWith({ avatarUrl: null });
  });

  it('does not remove the profile picture when the confirmation is declined', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'ada@acme.com', role: 'EMPLOYEE', status: 'ACTIVE', permissions: [], avatarUrl: 'https://signed.example/current.webp' },
      profile: { id: 'p1', employeeId: 'EMP-1', firstName: 'Ada', lastName: 'Lovelace', department: 'Eng', designation: 'Engineer' },
      tenant: null,
      isLoading: false,
      isAuthenticated: true,
      setSession: vi.fn(),
      logout: vi.fn(),
      updateUser,
    } as never);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<ProfilePictureUpload />);
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));

    expect(mockRemoveAvatar).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });
});
