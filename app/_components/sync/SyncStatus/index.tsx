'use client';

import { useSpace } from '@components/providers/AppProvider';
import { toast } from 'react-toastify';

export default function SyncStatus({ onStarted }) {
  const { syncStatus, pendingCount, syncNow } = useSpace();

  async function handleSync() {
    const sync = syncNow();
    onStarted?.();
    toast.info('Sync started');
    try {
      await sync;
      toast.success('Sync completed');
    } catch (error) {
      toast.error(error.message || 'Sync failed');
    }
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      className="flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm text-dark transition-colors active:bg-neutral-300/30 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:active:bg-light/10 md:text-base"
      disabled={syncStatus === 'syncing'}
    >
      <span>Sync data</span>
      {pendingCount > 0 && (
        <span className="rounded-full bg-ocean-blue/15 px-2 py-0.5 text-xs font-semibold text-deep-blue dark:bg-sky-blue/15 dark:text-sky-blue">
          {pendingCount}
        </span>
      )}
    </button>
  );
}
