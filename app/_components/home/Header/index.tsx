'use client';
import { useAuth, useSpace } from '@components/providers/AppProvider';
import { toast } from 'react-toastify';

export default function Header() {
  const { profile, user, isGuest, signInWithGoogle } = useAuth();
  const { activeSpace } = useSpace();
  return (
    <div className="w-full flex flex-col gap-1 mb-5">
      <p className="text-dark dark:text-white text-base md:text-lg">Welcome back,</p>
      <p className="text-dark dark:text-white w-full line-clamp-1 text-2xl md:text-3xl font-bold break-all">
        {profile?.display_name ?? user?.email}
      </p>
      <p className="text-xs text-dark/60 dark:text-white/60">
        {activeSpace?.name} · {activeSpace?.role}
      </p>
      {isGuest && (
        <>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Local guest mode - this data stays on this device until you sign in with Google.
          </p>
          <button
            type="button"
            className="self-start text-xs font-semibold text-deep-blue underline dark:text-sky-blue"
            onClick={() => signInWithGoogle().catch(error => toast.error(error.message))}
          >
            Sign in with Google and sync
          </button>
        </>
      )}
    </div>
  );
}
