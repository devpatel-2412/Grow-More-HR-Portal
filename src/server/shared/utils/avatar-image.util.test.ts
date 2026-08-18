import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processAvatarImage, AVATAR_OUTPUT_SIZE } from './avatar-image.util.js';
import { BadRequestError } from '../errors/app-error.js';

async function makeImage(format: 'jpeg' | 'png' | 'webp', width = 800, height = 600): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 100, g: 150, b: 200 } } })
    [format]()
    .toBuffer();
}

describe('processAvatarImage', () => {
  it('accepts a valid JPG, normalizing it to a square WEBP at AVATAR_OUTPUT_SIZE', async () => {
    const input = await makeImage('jpeg');
    const result = await processAvatarImage(input);

    expect(result.mimeType).toBe('image/webp');
    expect(result.fileName).toBe('avatar.webp');
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(AVATAR_OUTPUT_SIZE);
    expect(metadata.height).toBe(AVATAR_OUTPUT_SIZE);
  });

  it('accepts a valid PNG', async () => {
    const input = await makeImage('png');
    const result = await processAvatarImage(input);
    expect(result.mimeType).toBe('image/webp');
  });

  it('accepts a valid WEBP', async () => {
    const input = await makeImage('webp');
    const result = await processAvatarImage(input);
    expect(result.mimeType).toBe('image/webp');
  });

  it('crops a non-square source image to a 1:1 square, not just resizing it', async () => {
    const input = await makeImage('jpeg', 1600, 400); // wide banner-shaped source
    const result = await processAvatarImage(input);
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(metadata.height);
  });

  it('rejects a file that is not a decodable image at all (content-based, not extension-based)', async () => {
    const notAnImage = Buffer.from('this is definitely not image content, just plain text bytes');
    await expect(processAvatarImage(notAnImage)).rejects.toThrow(BadRequestError);
    await expect(processAvatarImage(notAnImage)).rejects.toThrow(/not a valid image/i);
  });

  it('rejects a real image encoded in a disallowed format even if it decodes cleanly (e.g. TIFF, GIF)', async () => {
    const gifBuffer = await sharp({ create: { width: 100, height: 100, channels: 3, background: 'red' } }).gif().toBuffer();
    await expect(processAvatarImage(gifBuffer)).rejects.toThrow(/only jpg, png, and webp/i);
  });

  it('rejects an empty buffer', async () => {
    await expect(processAvatarImage(Buffer.alloc(0))).rejects.toThrow(BadRequestError);
  });
});
