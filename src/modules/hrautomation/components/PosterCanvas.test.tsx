import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PosterCanvas, type PosterCanvasField } from './PosterCanvas';

function makeField(overrides: Partial<PosterCanvasField> = {}): PosterCanvasField {
  return { id: 'f1', x: 100, y: 50, fontSize: 16, color: '#ff0000', fontWeight: 'bold', text: 'Wanda Worker', ...overrides };
}

/** jsdom never actually loads the image, so the component's naturalSize state stays null until
 * we fire `load` ourselves with the natural dimensions the component would have read off it. */
function fireImageLoad(container: HTMLElement, width = 400, height = 300) {
  const img = container.querySelector('img')!;
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(img);
}

describe('PosterCanvas', () => {
  it('renders each field with its resolved text and style', () => {
    const { container } = render(
      <PosterCanvas backgroundUrl="https://x/bg.png" fields={[makeField()]} />,
    );
    fireImageLoad(container);

    const fieldEl = screen.getByText('Wanda Worker');
    expect(fieldEl).toHaveStyle({ color: 'rgb(255, 0, 0)', fontWeight: 'bold' });
  });

  it('does not expose drag affordances (role/tabIndex) in read-only mode', () => {
    render(<PosterCanvas backgroundUrl="https://x/bg.png" fields={[makeField()]} editable={false} />);
    expect(screen.queryByRole('button', { name: /reposition/i })).not.toBeInTheDocument();
  });

  it('calls onSelectField when an editable field is clicked', () => {
    const onSelectField = vi.fn();
    render(<PosterCanvas backgroundUrl="https://x/bg.png" fields={[makeField()]} editable onSelectField={onSelectField} />);
    fireEvent.click(screen.getByText('Wanda Worker'));
    expect(onSelectField).toHaveBeenCalledWith('f1');
  });

  it('nudges the field with arrow keys, clamped to the image bounds', () => {
    const onFieldMove = vi.fn();
    const { container } = render(
      <PosterCanvas backgroundUrl="https://x/bg.png" fields={[makeField({ x: 100, y: 50 })]} editable onFieldMove={onFieldMove} />,
    );
    fireImageLoad(container, 400, 300);

    const fieldEl = screen.getByText('Wanda Worker');
    fireEvent.keyDown(fieldEl, { key: 'ArrowRight' });
    expect(onFieldMove).toHaveBeenCalledWith('f1', 101, 50);

    fireEvent.keyDown(fieldEl, { key: 'ArrowUp', shiftKey: true });
    expect(onFieldMove).toHaveBeenCalledWith('f1', 100, 40);
  });

  it('clamps arrow-key movement at the top-left edge instead of going negative', () => {
    const onFieldMove = vi.fn();
    const { container } = render(
      <PosterCanvas backgroundUrl="https://x/bg.png" fields={[makeField({ x: 0, y: 0 })]} editable onFieldMove={onFieldMove} />,
    );
    fireImageLoad(container, 400, 300);

    fireEvent.keyDown(screen.getByText('Wanda Worker'), { key: 'ArrowLeft' });
    expect(onFieldMove).toHaveBeenCalledWith('f1', 0, 0);
  });
});
