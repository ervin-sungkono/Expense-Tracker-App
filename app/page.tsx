'use client';

import AppLogo from '@components/common/AppLogo';
import Button from '@components/common/Button';
import Loading from '@components/layout/Loading';
import { useAuth } from '@components/providers/AppProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { toast } from 'react-toastify';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured, user, authLoading, signInWithGoogle, startGuest } = useAuth();

  useEffect(() => {
    if (user) router.replace('/home');
  }, [router, user]);

  if (authLoading) return <Loading />;

  if (!user) {
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <AppLogo />
        <div>
          <h1 className="text-3xl font-bold">Your expenses, shared simply</h1>
          <p className="mt-2 text-sm text-dark/70 dark:text-white/70">
            {configured
              ? 'Sign in with Google to sync your spaces across devices, or continue locally without an account.'
              : 'Supabase is not configured. Continue locally to try Xpensed on this device.'}
          </p>
          {searchParams.get('authError') && (
            <p className="mt-2 text-sm text-red-600">
              Google authentication failed. Please try again.
            </p>
          )}
        </div>
        {configured && (
          <Button
            label="Continue with Google"
            onClick={() => signInWithGoogle().catch(error => toast.error(error.message))}
          />
        )}
        <Button
          label="Continue locally"
          style="primary"
          onClick={startGuest}
        />
        <p className="text-xs text-dark/60 dark:text-white/60">
          Guest data stays in this browser until you sign in and import it into a private space.
        </p>
      </div>
    );
  }

  return <Loading />;
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
