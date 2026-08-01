'use client';

import AppLogo from '@components/common/AppLogo';
import Button from '@components/common/Button';
import InputField from '@components/common/InputField';
import Loading from '@components/layout/Loading';
import { useAuth, useSpace } from '@components/providers/AppProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    configured,
    user,
    profile,
    privateKey,
    authLoading,
    signInWithGoogle,
    setupKeyring,
    unlockKeyring,
  } = useAuth();
  const { spaces, createSpace, spacesLoading } = useSpace();
  const [busy, setBusy] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [keySetupError, setKeySetupError] = useState('');
  const [keySetupAttempt, setKeySetupAttempt] = useState(0);
  const [spaceName, setSpaceName] = useState('My Space');
  const keySetupStarted = useRef(false);

  useEffect(() => {
    if (user && privateKey && spaces.length > 0) router.replace('/home');
  }, [privateKey, router, spaces, user]);

  useEffect(() => {
    if (!user || !profile || profile.active_key_version || keySetupStarted.current) return;

    keySetupStarted.current = true;
    setupKeyring().catch(error => {
      keySetupStarted.current = false;
      setKeySetupError(error.message);
    });
  }, [keySetupAttempt, profile, setupKeyring, user]);

  if (authLoading || spacesLoading) return <Loading />;

  if (!configured) {
    return (
      <div className="max-w-xl text-center flex flex-col gap-3">
        <AppLogo />
        <h1 className="text-2xl font-bold">Supabase setup required</h1>
        <p className="text-sm text-dark/70 dark:text-white/70">
          Configure the Supabase environment variables from .env.example, then enable Google OAuth
          in Supabase.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <AppLogo />
        <div>
          <h1 className="text-3xl font-bold">Your expenses, privately shared</h1>
          <p className="mt-2 text-sm text-dark/70 dark:text-white/70">
            Sign in with Google to sync encrypted spaces across devices.
          </p>
          {searchParams.get('authError') && (
            <p className="mt-2 text-sm text-red-600">
              Google authentication failed. Please try again.
            </p>
          )}
        </div>
        <Button
          label="Continue with Google"
          onClick={() => signInWithGoogle().catch(error => toast.error(error.message))}
        />
      </div>
    );
  }

  if (!profile?.active_key_version) {
    if (!keySetupError) return <Loading />;

    return (
      <div className="w-full max-w-md flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold">Encryption setup failed</h1>
        <p className="text-sm text-dark/70 dark:text-white/70">{keySetupError}</p>
        <Button
          label="Try again"
          onClick={() => {
            keySetupStarted.current = false;
            setKeySetupError('');
            setKeySetupAttempt(attempt => attempt + 1);
          }}
        />
      </div>
    );
  }

  if (!privateKey) {
    const submit = async event => {
      event.preventDefault();
      setBusy(true);
      try {
        await unlockKeyring(passphrase);
        toast.success('Encryption key unlocked');
      } catch {
        toast.error('Unable to unlock. Check your recovery passphrase.');
      } finally {
        setBusy(false);
      }
    };
    return (
      <form onSubmit={submit} className="w-full max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Unlock this device</h1>
        <InputField
          required
          type="password"
          name="passphrase"
          label="Recovery passphrase"
          value={passphrase}
          onChange={event => setPassphrase(event.target.value)}
        />
        <Button type="submit" label={busy ? 'Unlocking…' : 'Unlock'} />
      </form>
    );
  }

  const submitSpace = async event => {
    event.preventDefault();
    setBusy(true);
    try {
      await createSpace(spaceName);
      toast.success('Space created');
      router.replace('/home');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submitSpace} className="w-full max-w-md flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Create your first space</h1>
      <p className="text-sm text-dark/70 dark:text-white/70">
        A space contains its own transactions, categories, budgets, shops, members, and encryption
        key. Your encryption key stays on this device.
      </p>
      <InputField
        required
        name="spaceName"
        label="Space name"
        value={spaceName}
        onChange={event => setSpaceName(event.target.value)}
      />
      <Button type="submit" label={busy ? 'Creating…' : 'Create space'} />
    </form>
  );
}

export default function Onboarding() {
  return (
    <main className="min-h-screen px-6 py-10 flex items-center justify-center text-dark dark:text-white">
      <Suspense fallback={<Loading />}>
        <OnboardingContent />
      </Suspense>
    </main>
  );
}
