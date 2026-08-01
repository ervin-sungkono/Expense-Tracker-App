'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Button from '@components/common/Button';
import { useAuth, useSpace } from '@components/providers/AppProvider';

function InviteContent() {
  const token = useSearchParams().get('token');
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const { refreshSpaces } = useSpace();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !token) return;
    fetch(`/api/invitations?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        return body;
      })
      .then(setInvite)
      .catch(error => setError(error.message));
  }, [token, user]);

  async function accept() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await refreshSpaces();
      router.replace('/home');
    } catch (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  if (!user)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">Space invitation</h1>
        <p>Sign in with the invited Google account.</p>
        <Button
          label="Continue with Google"
          contained
          onClick={() => signInWithGoogle(`/invite?token=${encodeURIComponent(token)}`)}
        />
      </main>
    );
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Space invitation</h1>
      {invite && (
        <>
          <p>
            Join <strong>{invite.spaces.name}</strong> as {invite.role}?
          </p>
          <Button label={busy ? 'Joining…' : 'Accept invitation'} contained onClick={accept} />
        </>
      )}
      {!invite && !error && <p>Checking invitation…</p>}
      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-6">
          Checking invitation…
        </main>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
