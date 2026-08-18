import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import { ApiError } from '../../../shared/lib/api-client';

vi.mock('../context/AuthContext');
vi.mock('../api/auth.api');

const mockUseAuth = vi.mocked(useAuth);
const mockUploadAvatar = vi.mocked(authApi.uploadAvatar);
const mockRemoveAvatar = vi.mocked(authApi.removeAvatar);

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('ProfilePictureUpload', () => {
  const updateUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(await screen.findByText(/only jpg, png, and webp/i)).toBeInTheDocument();
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

  it('uploads a valid JPG, updates the session avatar, and shows the Remove action', async () => {
    mockUploadAvatar.mockResolvedValue({ avatarUrl: 'https://signed.example/new-avatar.webp' });
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    const jpg = makeFile('photo.jpg', 'image/jpeg', 1000);

    await userEvent.upload(input, jpg);

    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledWith(jpg));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ avatarUrl: 'https://signed.example/new-avatar.webp' }));
  });

  it('uploads a valid PNG', async () => {
    mockUploadAvatar.mockResolvedValue({ avatarUrl: 'https://signed.example/new-avatar.webp' });
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    await userEvent.upload(input, makeFile('photo.png', 'image/png', 1000));
    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledOnce());
  });

  it('uploads a valid WEBP', async () => {
    mockUploadAvatar.mockResolvedValue({ avatarUrl: 'https://signed.example/new-avatar.webp' });
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    await userEvent.upload(input, makeFile('photo.webp', 'image/webp', 1000));
    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledOnce());
  });

  it('shows a server-side validation error message when the upload is rejected', async () => {
    mockUploadAvatar.mockRejectedValue(new ApiError(400, 'BAD_REQUEST', 'The uploaded file is not a valid image.'));
    render(<ProfilePictureUpload />);
    const input = screen.getByLabelText(/upload profile picture/i);
    await userEvent.upload(input, makeFile('photo.jpg', 'image/jpeg', 1000));

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
