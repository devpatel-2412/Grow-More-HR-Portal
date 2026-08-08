import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './msw/server';

// jsdom doesn't implement matchMedia — ThemeProvider (rendered by every test using
// renderWithProviders) reads it on mount to detect the OS color-scheme preference.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom doesn't implement the Pointer Events capture APIs or scrollIntoView — Radix UI's Select
// (and other pointer-driven primitives) call these during open/select interactions and throw
// without them, regardless of which component under test uses Select.
window.HTMLElement.prototype.hasPointerCapture ??= () => false;
window.HTMLElement.prototype.setPointerCapture ??= () => {};
window.HTMLElement.prototype.releasePointerCapture ??= () => {};
window.HTMLElement.prototype.scrollIntoView ??= () => {};

// jsdom doesn't implement ResizeObserver — Radix UI's Checkbox (useSize) reads it on mount,
// regardless of which component under test renders one.
(window as unknown as { ResizeObserver: unknown }).ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
