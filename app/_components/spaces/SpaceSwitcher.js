'use client';

import { useSpace } from '@components/providers/AppProvider';

export default function SpaceSwitcher() {
    const { spaces, activeSpaceId, setActiveSpaceId } = useSpace();
    if (!activeSpaceId) return null;

    return (
        <div className="flex items-center gap-2 min-w-0">
            <label htmlFor="active-space" className="sr-only">Active space</label>
            <select
                id="active-space"
                value={activeSpaceId}
                onChange={event => setActiveSpaceId(event.target.value)}
                className="max-w-44 truncate rounded-full bg-white/15 text-white text-sm font-semibold px-3 py-1.5 outline-none"
            >
                {spaces.map(space => <option className="text-dark" key={space.id} value={space.id}>{space.name}</option>)}
            </select>
        </div>
    );
}
