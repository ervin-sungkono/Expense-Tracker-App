'use client';

import AppLogo from '@components/common/AppLogo';
import Button from '@components/common/Button';
import Loading from '@components/layout/Loading';
import { useAuth } from '@components/providers/AppProvider';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type AuthorizationDetails = {
  client?: { name?: string; client_name?: string; redirect_uris?: string[] };
  client_name?: string;
  redirect_uri?: string;
  scope?: string;
};

function ConsentContent() {
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get('authorization_id');
  const { configured, user, isGuest, authLoading, supabase, signInWithGoogle } = useAuth();
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || isGuest || !authorizationId) return;
    let active = true;
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error }) => {
      if (!active) return;
      if (error) setError('This authorization request is invalid or expired.');
      else setDetails((data ?? {}) as AuthorizationDetails);
    });
    return () => {
      active = false;
    };
  }, [authorizationId, isGuest, supabase, user]);

  if (authLoading) return <Loading />;
  if (!configured) return <p>Supabase OAuth is not configured.</p>;
  if (!authorizationId) return <p>This authorization request is missing its ID.</p>;

  if (!user || isGuest) {
    const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <AppLogo />
        <h1 className="text-2xl font-bold">Connect an expense assistant</h1>
        <p className="text-sm text-dark/70 dark:text-white/70">
          Sign in before reviewing this connection request.
        </p>
        <Button label="Continue with Google" onClick={() => signInWithGoogle(next)} />
      </div>
    );
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!details) return <Loading />;

  const clientName = details.client?.name ?? details.client?.client_name ?? details.client_name;
  const redirectUri = details.redirect_uri ?? details.client?.redirect_uris?.[0];

  async function finish(action: 'approve' | 'deny') {
    setSubmitting(true);
    setError(null);
    const result =
      action === 'approve'
        ? await supabase.auth.oauth.approveAuthorization(authorizationId!)
        : await supabase.auth.oauth.denyAuthorization(authorizationId!);
    if (result.error || !result.data?.redirect_url) {
      setSubmitting(false);
      setError('Unable to complete this authorization request.');
      return;
    }
    window.location.assign(result.data.redirect_url);
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-5 rounded-2xl border border-dark/10 p-6 dark:border-white/15">
      <AppLogo />
      <div>
        <h1 className="text-2xl font-bold">Allow access to Xpensed?</h1>
        <p className="mt-2 text-sm text-dark/70 dark:text-white/70">
          {clientName || 'An expense assistant'} wants to connect as {user.email}.
        </p>
      </div>
      <div className="text-sm">
        <p className="font-semibold">This connection can:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Read your accessible spaces, expense categories, shops, and transactions.</li>
          <li>Create IDR expense transactions from Gmail messages.</li>
          <li>Check Gmail message IDs to avoid duplicate imports.</li>
        </ul>
        <p className="mt-3">It cannot delete transactions or manage spaces, members, or budgets.</p>
      </div>
      {redirectUri && (
        <p className="break-all text-xs text-dark/60 dark:text-white/60">
          Return address: {redirectUri}
        </p>
      )}
      <div className="flex gap-3">
        <Button label="Allow" disabled={submitting} onClick={() => finish('approve')} />
        <Button label="Deny" disabled={submitting} onClick={() => finish('deny')} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <main className="min-h-screen px-6 py-10 flex items-center justify-center text-dark dark:text-white">
      <Suspense fallback={<Loading />}>
        <ConsentContent />
      </Suspense>
    </main>
  );
}
