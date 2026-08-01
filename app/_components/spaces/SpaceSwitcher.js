'use client';

import { useSpace } from '@components/providers/AppProvider';
import { IoChevronDown as DownIcon } from 'react-icons/io5';

export default function SpaceSwitcher() {
  const { spaces, activeSpaceId, setActiveSpaceId } = useSpace();
  if (!activeSpaceId) return null;

  return (
    <div className="relative flex min-w-0 items-center gap-2">
      <label htmlFor="active-space" className="sr-only">
        Active space
      </label>
      <select
        id="active-space"
        value={activeSpaceId}
        onChange={event => setActiveSpaceId(event.target.value)}
        className="max-w-44 appearance-none truncate rounded-full border border-white/20 bg-white/15 py-1.5 pl-3 pr-8 text-sm font-semibold text-white outline-none transition-colors hover:bg-white/20 focus:border-white/50 focus:ring-2 focus:ring-white/20"
      >
        {spaces.map(space => (
          <option className="bg-ocean-blue text-white" key={space.id} value={space.id}>
            {space.name}
          </option>
        ))}
      </select>
      <DownIcon
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white"
      />
    </div>
  );
}
