'use client';

import { useSpace } from '@components/providers/AppProvider';
import { toast } from 'react-toastify';

export default function SyncStatus() {
    const { syncStatus, pendingCount, syncNow } = useSpace();
    const label = syncStatus === 'syncing'
        ? 'Syncing…'
        : syncStatus === 'error'
            ? 'Sync error'
            : pendingCount > 0
                ? `${pendingCount} pending`
                : syncStatus === 'synced' ? 'Synced' : 'Offline-ready';

    return (
        <button
            type="button"
            onClick={() => syncNow().catch(error => toast.error(error.message))}
            className="text-[10px] md:text-xs text-white/80 hover:text-white whitespace-nowrap"
            disabled={syncStatus === 'syncing'}
        >
            {label}
        </button>
    );
}
