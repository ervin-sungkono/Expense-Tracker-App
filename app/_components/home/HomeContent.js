'use client';

import Button from '@components/common/Button';
import InputField from '@components/common/InputField';
import { useSpace } from '@components/providers/AppProvider';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function HomeContent({ children }) {
  const { activeSpace, createSpace } = useSpace();
  const [spaceName, setSpaceName] = useState('My Space');
  const [busy, setBusy] = useState(false);

  if (activeSpace) return <>{children}</>;

  async function handleCreateSpace(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await createSpace(spaceName);
      toast.success('Space created');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center">
      <form onSubmit={handleCreateSpace} className="w-full max-w-md flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create your first space</h1>
          <p className="mt-2 text-sm text-dark/70 dark:text-white/70">
            A space keeps your transactions, categories, budgets, and shops together. You can invite
            other people after creating it.
          </p>
        </div>
        <InputField
          required
          name="spaceName"
          label="Space name"
          value={spaceName}
          onChange={event => setSpaceName(event.target.value)}
        />
        <Button type="submit" label={busy ? 'Creating…' : 'Create space'} />
      </form>
    </div>
  );
}
