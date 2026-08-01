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
  const { configured, user, authLoading, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user) router.replace('/home');
  }, [router, user]);

  if (authLoading) return <Loading />;

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
          <h1 className="text-3xl font-bold">Your expenses, shared simply</h1>
          <p className="mt-2 text-sm text-dark/70 dark:text-white/70">
            Sign in with Google to sync your spaces across devices.
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
