'use client';

import { useSpace } from '@components/providers/AppProvider';
import { useEffect, useRef, useState } from 'react';
import { IoCheckmark as CheckIcon, IoChevronDown as DownIcon } from 'react-icons/io5';

export default function SpaceSwitcher() {
  const { spaces, activeSpaceId, setActiveSpaceId } = useSpace();
  const [open, setOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const rootRef = useRef(null);
  const activeSpace = spaces.find(space => space.id === activeSpaceId);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!activeSpaceId) return null;

  function chooseSpace(spaceId) {
    setActiveSpaceId(spaceId);
    setHighlightedId(spaceId);
    setOpen(false);
  }

  function openDropdown() {
    setHighlightedId(activeSpaceId);
    setOpen(true);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open && highlightedId) chooseSpace(highlightedId);
      else openDropdown();
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    if (!spaces.length) return;
    event.preventDefault();
    const currentIndex = spaces.findIndex(space => space.id === (highlightedId ?? activeSpaceId));
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + direction + spaces.length) % spaces.length;
    setHighlightedId(spaces[nextIndex].id);
    setOpen(true);
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div
        role="combobox"
        tabIndex={0}
        aria-label="Active space"
        aria-controls="space-switcher-options"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open && highlightedId ? `space-option-${highlightedId}` : undefined}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={handleKeyDown}
        className="flex max-w-44 cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/15 py-1.5 pl-3 pr-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-white/20 focus:border-white/50 focus:ring-2 focus:ring-sky-blue/40"
      >
        <span className="truncate">{activeSpace?.name ?? 'Select space'}</span>
        <DownIcon
          aria-hidden
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && (
        <div
          id="space-switcher-options"
          role="listbox"
          aria-label="Spaces"
          className="absolute right-0 top-full z-50 mt-2 min-w-full w-max max-w-64 overflow-hidden rounded-lg border border-sky-blue/30 bg-deep-blue/95 p-1.5 text-white shadow-xl shadow-dark/25 backdrop-blur-sm"
        >
          {spaces.map(space => {
            const selected = space.id === activeSpaceId;
            const highlighted = space.id === highlightedId;
            return (
              <div
                id={`space-option-${space.id}`}
                role="option"
                aria-selected={selected}
                key={space.id}
                onMouseEnter={() => setHighlightedId(space.id)}
                onClick={event => {
                  event.stopPropagation();
                  chooseSpace(space.id);
                }}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${highlighted ? 'bg-sky-blue/20' : 'hover:bg-white/10'}`}
              >
                <span className="min-w-0 flex-1 truncate">{space.name}</span>
                <CheckIcon
                  aria-hidden
                  className={`shrink-0 text-sky-blue ${selected ? 'opacity-100' : 'opacity-0'}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
