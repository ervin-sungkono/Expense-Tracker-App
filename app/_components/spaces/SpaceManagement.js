'use client';

import { useEffect, useState } from 'react';
import Button from '../common/Button';
import InputField from '../common/InputField';
import { useAuth, useSpace } from '../providers/AppProvider';
import { base64ToBytea } from '@lib/supabase/binary';
import { createInvitationSecret, encryptSpaceKeyForInvitation, sha256Base64 } from '@lib/crypto';

export default function SpaceManagement() {
  const { supabase, user } = useAuth();
  const { activeSpace, activeSpaceKey, canManageSpace, spaces, createSpace, refreshSpaces } =
    useSpace();
  const [members, setMembers] = useState([]);
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!activeSpace) return;
    supabase
      .from('space_members')
      .select('user_id,role,status,profiles(display_name,avatar_url)')
      .eq('space_id', activeSpace.id)
      .then(({ data }) => setMembers(data ?? []));
  }, [activeSpace, supabase]);

  async function handleCreateSpace(event) {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get('spaceName')?.toString().trim();
    if (!name) return;
    setBusy(true);
    setMessage('');
    try {
      await createSpace(name);
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(event) {
    event.preventDefault();
    if (!activeSpaceKey) return setMessage('Unlock this space before inviting someone.');
    const values = new FormData(event.currentTarget);
    const email = values.get('email').toString().trim().toLowerCase();
    const role = values.get('role').toString();
    const token = createInvitationSecret();
    const secret = createInvitationSecret();
    const encrypted = await encryptSpaceKeyForInvitation(activeSpaceKey, secret, {
      spaceId: activeSpace.id,
      email,
      role,
      keyVersion: activeSpace.current_key_version,
    });
    setBusy(true);
    setMessage('');
    const { data, error } = await supabase
      .from('space_invitations')
      .insert({
        space_id: activeSpace.id,
        created_by: user.id,
        invited_email: email,
        role,
        token_hash: base64ToBytea(await sha256Base64(token)),
        encrypted_space_key: base64ToBytea(encrypted.encryptedSpaceKey),
        key_iv: base64ToBytea(encrypted.iv),
        space_key_version: activeSpace.current_key_version,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select('id')
      .single();
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    const invitationLink = `${window.location.origin}/invite?token=${encodeURIComponent(token)}#key=${encodeURIComponent(secret)}`;
    setLink(invitationLink);
    try {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: data.id, link: invitationLink }),
      });
      setMessage(
        response.ok
          ? 'Invitation email sent. You can also copy the link.'
          : 'Email is unavailable; copy and send the link.'
      );
    } catch {
      setMessage('Email is unavailable; copy and send the link.');
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">
          Spaces ({spaces.filter(space => space.owner_id === user?.id).length}/3 owned)
        </h2>
        <p className="text-sm">
          Current: {activeSpace?.name} · {activeSpace?.role}
        </p>
        {spaces.filter(space => space.owner_id === user?.id).length < 3 && (
          <form className="flex flex-col gap-3" onSubmit={handleCreateSpace}>
            <InputField name="spaceName" label="New space name" required maxLength={60} />
            <Button type="submit" label={busy ? 'Working…' : 'Create space'} contained />
          </form>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Members</h2>
        {members.map(member => (
          <div key={member.user_id} className="flex justify-between border-b py-2 text-sm">
            <span>{member.profiles?.display_name ?? member.user_id}</span>
            <span className="capitalize">{member.role}</span>
          </div>
        ))}
      </section>
      {canManageSpace && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Invite someone</h2>
          <form className="flex flex-col gap-3" onSubmit={handleInvite}>
            <InputField name="email" type="email" label="Google account email" required />
            <label className="text-sm font-semibold">
              Role
              <select name="role" className="ml-3 rounded border bg-transparent px-3 py-2">
                <option value="viewer">Viewer</option>
                <option value="collaborator">Collaborator</option>
              </select>
            </label>
            <Button type="submit" label={busy ? 'Working…' : 'Create invitation'} contained />
          </form>
          {link && (
            <div className="flex flex-col gap-2">
              <input
                readOnly
                value={link}
                className="w-full rounded border bg-transparent p-2 text-xs"
              />
              <Button
                label="Copy link"
                contained
                onClick={() => navigator.clipboard.writeText(link)}
              />
            </div>
          )}
        </section>
      )}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
