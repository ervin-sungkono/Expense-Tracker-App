'use client';

import Button from '@components/common/Button';
import Dialog from '@components/common/Dialog';
import { useAuth, useSpace } from '@components/providers/AppProvider';
import { useEffect, useMemo, useState } from 'react';

const DELETE_CONFIRMATION = 'DELETE GUEST DATA';

export default function GuestMigrationDialog() {
  const {
    user,
    guestMigrationPending,
    guestMigrationSummary,
    guestMigrationBusy,
    guestMigrationError,
    importGuestData,
    deferGuestMigration,
    discardGuestData,
  } = useAuth();
  const { spaces } = useSpace();
  const [destination, setDestination] = useState('new');
  const [spaceName, setSpaceName] = useState('Imported guest data');
  const [confirmation, setConfirmation] = useState('');

  const adminSpaces = useMemo(
    () => spaces.filter(space => space.role === 'admin'),
    [spaces]
  );
  const ownedSpaceCount = spaces.filter(space => space.owner_id === user?.id).length;
  const canCreateSpace = ownedSpaceCount < 3;

  useEffect(() => {
    if (guestMigrationPending) {
      setDestination(canCreateSpace ? 'new' : (adminSpaces[0]?.id ?? ''));
      setConfirmation('');
    }
  }, [adminSpaces, canCreateSpace, guestMigrationPending]);

  if (!guestMigrationPending) return null;

  const summary = guestMigrationSummary ?? {
    transactions: 0,
    categories: 0,
    budgets: 0,
    shops: 0,
    total: 0,
  };

  async function handleImport() {
    if (!destination || (destination === 'new' && (!canCreateSpace || !spaceName.trim()))) return;
    if (destination === 'new' && /[\u0000-\u001f\u007f]/.test(spaceName)) return;
    await importGuestData({
      spaceId: destination,
      spaceName: spaceName.trim(),
    });
  }

  async function handleDiscard() {
    if (confirmation !== DELETE_CONFIRMATION) return;
    await discardGuestData();
  }

  return (
    <Dialog show={true} hideFn={deferGuestMigration}>
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-bold">Import local guest data</h2>
          <p className="mt-2 text-sm text-dark/70 dark:text-white/70">
            Choose where to move this browser-only data. Sync stays paused until you decide.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <p>Transactions: {summary.transactions}</p>
          <p>Categories: {summary.categories}</p>
          <p>Budgets: {summary.budgets}</p>
          <p>Shops: {summary.shops}</p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold" htmlFor="guest-migration-destination">
            Destination
          </label>
          <select
            id="guest-migration-destination"
            value={destination}
            onChange={event => setDestination(event.target.value)}
            className="rounded-md border border-deep-blue bg-transparent px-3 py-2 text-sm text-dark dark:border-ocean-blue/60 dark:text-white"
          >
            {canCreateSpace && <option value="new">Create a new private space</option>}
            {adminSpaces.map(space => (
              <option key={space.id} value={space.id}>
                Import into {space.name}
              </option>
            ))}
          </select>

          {destination === 'new' && canCreateSpace && (
            <input
              value={spaceName}
              onChange={event => setSpaceName(event.target.value)}
              maxLength={60}
              placeholder="Space name"
              className="rounded-md border border-deep-blue bg-transparent px-3 py-2 text-sm text-dark dark:border-ocean-blue/60 dark:text-white"
            />
          )}

          {!adminSpaces.length && !canCreateSpace && (
            <p className="text-sm text-red-600">
              You have no eligible destination. Delete the guest data or free a space first.
            </p>
          )}
          <p className="text-xs text-dark/60 dark:text-white/60">
            Importing into a shared space makes these records visible to its members.
          </p>
          <Button
            label={guestMigrationBusy ? 'Importing...' : 'Import guest data'}
            onClick={() => handleImport().catch(() => {})}
            contained
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-dark/10 pt-4 dark:border-white/10">
          <p className="text-sm font-semibold">Delete instead</p>
          <p className="text-xs text-dark/60 dark:text-white/60">
            This permanently removes the guest records from this browser. Type {DELETE_CONFIRMATION} to confirm.
          </p>
          <input
            value={confirmation}
            onChange={event => setConfirmation(event.target.value)}
            placeholder={DELETE_CONFIRMATION}
            className="rounded-md border border-red-500 bg-transparent px-3 py-2 text-sm text-dark dark:text-white"
          />
          <Button
            label="Delete guest data"
            style="danger"
            onClick={() => handleDiscard().catch(() => {})}
            contained
          />
        </div>

        {guestMigrationError && <p className="text-sm text-red-600">{guestMigrationError}</p>}
        <button
          type="button"
          onClick={deferGuestMigration}
          className="self-center text-sm font-semibold text-deep-blue underline dark:text-sky-blue"
        >
          Decide later
        </button>
      </div>
    </Dialog>
  );
}
