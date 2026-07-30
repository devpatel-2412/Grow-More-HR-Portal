import type { ReactNode } from 'react';
import { ThemeToggle } from '../ui/theme-toggle';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dot-grid relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-12">
      <ThemeToggle className="fixed top-4 right-4 z-20" />
      {children}
    </div>
  );
}
