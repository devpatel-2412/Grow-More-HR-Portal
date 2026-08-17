import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { NAV_ITEMS, isNavItemVisible, type NavItem } from '../../config/nav-items';
import { cn } from '../../utils/cn';

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
}

const OPEN_EVENT = 'command-palette:open';

/** Lets any component (e.g. the header's search field) open the palette without CommandPalette
 * having to lift its open state into a shared context. */
export function openCommandPalette(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * Global Ctrl+K / Cmd+K launcher — searches the same NAV_ITEMS list the sidebar renders from,
 * pre-filtered to whatever the current role can actually see (never offers a destination that
 * would just 403). Built on the raw Dialog primitive rather than the shared Dialog component
 * since it needs a top-anchored panel, not the app's standard centered modal.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => isNavItemVisible(item, user));
  }, [user]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleItems;
    return visibleItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [visibleItems, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function onOpenRequest() {
      setOpen(true);
    }
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpenRequest);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(item: NavItem) {
    setOpen(false);
    navigate(item.path);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) go(item);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className="surface-overlay fixed top-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search and jump to any page you have access to.
          </DialogPrimitive.Description>
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Jump to a page&hellip;"
              aria-label="Search pages"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-results"
              aria-activedescendant={results[activeIndex] ? `command-palette-item-${results[activeIndex].path}` : undefined}
              className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
            />
            <kbd className="hidden shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)] sm:block">
              Esc
            </kbd>
          </div>

          <ul id="command-palette-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 && <li className="p-4 text-center text-xs text-[var(--muted-foreground)]">No matching pages.</li>}
            {results.map((item, index) => (
              <li key={item.path} id={`command-palette-item-${item.path}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onClick={() => go(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm',
                    index === activeIndex ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)]',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--muted-foreground)]">
            <span>&uarr;&darr; to navigate, Enter to select</span>
            <span>{isMac() ? '⌘K' : 'Ctrl+K'} to toggle</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
