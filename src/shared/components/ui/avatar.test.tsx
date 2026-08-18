import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from './avatar';

describe('Avatar', () => {
  it('renders initials from a two-word name when there is no image', () => {
    render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveTextContent('AL');
  });

  it('renders a single, uppercased initial for a one-word name (e.g. an email used as the name)', () => {
    render(<Avatar name="ada@acme.com" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders an <img> when imageUrl is provided', () => {
    render(<Avatar name="Ada Lovelace" imageUrl="https://example.com/avatar.webp" />);
    const img = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.webp');
  });

  it('falls back to initials when the image fails to load (broken/expired URL)', () => {
    render(<Avatar name="Ada Lovelace" imageUrl="https://example.com/broken.webp" />);
    const img = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(img.tagName).toBe('IMG');

    fireEvent.error(img);

    const fallback = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(fallback.tagName).toBe('DIV');
    expect(fallback).toHaveTextContent('AL');
  });

  it('gives a fresh image a real chance again after a URL change, even if a previous URL had failed', () => {
    const { rerender } = render(<Avatar name="Ada Lovelace" imageUrl="https://example.com/broken.webp" />);
    fireEvent.error(screen.getByRole('img', { name: 'Ada Lovelace' }));
    expect(screen.getByRole('img', { name: 'Ada Lovelace' }).tagName).toBe('DIV');

    rerender(<Avatar name="Ada Lovelace" imageUrl="https://example.com/new-avatar.webp" />);
    const img = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', 'https://example.com/new-avatar.webp');
  });
});
