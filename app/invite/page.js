'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Button from '@components/common/Button';
import { useAuth, useSpace } from '@components/providers/AppProvider';
import { byteaToBase64 } from '@lib/supabase/binary';
import { decryptInvitationSpaceKey, importPublicKey, wrapSpaceKey } from '@lib/crypto';
import { saveSpaceKey } from '@lib/keyStore';

function InviteContent() {
    const token = useSearchParams().get('token');
    const router = useRouter();
    const { user, profile, privateKey, supabase, signInWithGoogle } = useAuth();
    const { refreshSpaces } = useSpace();
    const [invite, setInvite] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!user || !token) return;
        fetch(`/api/invitations?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
            .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; })
            .then(setInvite).catch(error => setError(error.message));
    }, [token, user]);

    async function accept() {
        if (!privateKey || !profile?.active_key_version) return setError('Unlock your recovery key on the sign-in page first.');
        const secret = new URLSearchParams(window.location.hash.slice(1)).get('key');
        if (!secret) return setError('The invitation decryption key is missing from this link.');
        setBusy(true); setError('');
        try {
            const spaceKey = await decryptInvitationSpaceKey({ encryptedSpaceKey: byteaToBase64(invite.encrypted_space_key), iv: byteaToBase64(invite.key_iv) }, secret, {
                spaceId: invite.space_id, email: invite.invited_email, role: invite.role, keyVersion: invite.space_key_version,
            });
            const { data: publicRow, error: keyError } = await supabase.from('user_public_keys').select('public_key_jwk').eq('user_id', user.id).eq('key_version', profile.active_key_version).single();
            if (keyError) throw keyError;
            const wrappedSpaceKey = await wrapSpaceKey(spaceKey, await importPublicKey(publicRow.public_key_jwk));
            const response = await fetch('/api/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, wrappedSpaceKey, userKeyVersion: profile.active_key_version }) });
            const body = await response.json(); if (!response.ok) throw new Error(body.error);
            await saveSpaceKey(user.id, invite.space_id, invite.space_key_version, spaceKey);
            await refreshSpaces();
            router.replace('/home');
        } catch (error) { setError(error.message); setBusy(false); }
    }

    if (!user) return <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"><h1 className="text-2xl font-bold">Space invitation</h1><p>Sign in with the invited Google account.</p><Button label="Continue with Google" contained onClick={() => signInWithGoogle(`/invite?token=${encodeURIComponent(token)}${window.location.hash}`)}/></main>;
    return <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"><h1 className="text-2xl font-bold">Space invitation</h1>{invite && <><p>Join <strong>{invite.spaces.name}</strong> as {invite.role}?</p><Button label={busy ? 'Joining…' : 'Accept invitation'} contained onClick={accept}/></>}{!invite && !error && <p>Checking invitation…</p>}{error && <p className="text-red-600">{error}</p>}</main>;
}

export default function InvitePage() {
    return <Suspense fallback={<main className="min-h-screen flex items-center justify-center p-6">Checking invitation…</main>}><InviteContent/></Suspense>;
}
