import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDropzone } from './file-dropzone';

function makeFile(name: string, sizeBytes: number, type = 'application/pdf'): File {
  const file = new File(['x'.repeat(Math.min(sizeBytes, 10))], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('FileDropzone', () => {
  it('adds a file selected through the hidden file input and reports it up via onFilesChange', async () => {
    const onFilesChange = vi.fn();
    const user = userEvent.setup();
    render(<FileDropzone files={[]} onFilesChange={onFilesChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('resume.pdf', 1024);
    await user.upload(input, file);

    expect(onFilesChange).toHaveBeenCalledWith([file]);
  });

  it('appends to the existing file list rather than replacing it, when multiple is true', async () => {
    const onFilesChange = vi.fn();
    const user = userEvent.setup();
    const existing = makeFile('already-added.pdf', 500);
    render(<FileDropzone files={[existing]} onFilesChange={onFilesChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const newFile = makeFile('second.pdf', 500);
    await user.upload(input, newFile);

    expect(onFilesChange).toHaveBeenCalledWith([existing, newFile]);
  });

  it('rejects a file over the configured max size instead of calling onFilesChange', async () => {
    const onFilesChange = vi.fn();
    const user = userEvent.setup();
    render(<FileDropzone files={[]} onFilesChange={onFilesChange} maxSizeBytes={1024} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makeFile('huge.pdf', 5000));

    expect(onFilesChange).not.toHaveBeenCalled();
    expect(screen.getByText(/larger than/i)).toBeInTheDocument();
  });

  it('rejects more files than maxFiles allows', async () => {
    const onFilesChange = vi.fn();
    const user = userEvent.setup();
    render(<FileDropzone files={[]} onFilesChange={onFilesChange} maxFiles={1} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, [makeFile('a.pdf', 100), makeFile('b.pdf', 100)]);

    expect(onFilesChange).not.toHaveBeenCalled();
    expect(screen.getByText(/up to 1 files/i)).toBeInTheDocument();
  });

  it('lists selected files with a remove control that drops just that one file', async () => {
    const onFilesChange = vi.fn();
    const user = userEvent.setup();
    const fileA = makeFile('a.pdf', 100);
    const fileB = makeFile('b.pdf', 100);
    render(<FileDropzone files={[fileA, fileB]} onFilesChange={onFilesChange} />);

    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove a.pdf' }));
    expect(onFilesChange).toHaveBeenCalledWith([fileB]);
  });

  it('replaces rather than appends when multiple is false', async () => {
    const onFilesChange = vi.fn();
    const user = userEvent.setup();
    const existing = makeFile('old.pdf', 100);
    render(<FileDropzone files={[existing]} onFilesChange={onFilesChange} multiple={false} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const replacement = makeFile('new.pdf', 100);
    await user.upload(input, replacement);

    expect(onFilesChange).toHaveBeenCalledWith([replacement]);
  });
});
