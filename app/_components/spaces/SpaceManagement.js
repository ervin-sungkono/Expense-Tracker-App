'use client';

import { useEffect, useState } from 'react';
import { IoMdMore as MoreIcon } from 'react-icons/io';
import { IoChevronDown as DownIcon } from 'react-icons/io5';
import Button from '../common/Button';
import ContextMenu from '../common/ContextMenu';
import InputField from '../common/InputField';
import { useAuth, useSpace } from '../providers/AppProvider';

async function invitationTokenHash(token) {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  );
  return `\\x${Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export default function SpaceManagement() {
  const { supabase, user } = useAuth();
  const { activeSpace, canManageSpace, spaces, createSpace, refreshSpaces } = useSpace();
  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState('');
  const [memberMenuId, setMemberMenuId] = useState(null);
  const [memberActionId, setMemberActionId] = useState(null);
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!activeSpace) {
      setMembers([]);
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      setMembersError('');
      const { data: memberRows, error: membersLoadError } = await supabase
        .from('space_members')
        .select('user_id,role,status')
        .eq('space_id', activeSpace.id)
        .eq('status', 'active');

      if (membersLoadError) {
        if (!cancelled) {
          setMembers([]);
          setMembersError('Unable to load members. Please try again.');
        }
        return;
      }

      const userIds = memberRows.map(member => member.user_id);
      if (!userIds.length) {
        if (!cancelled) setMembers([]);
        return;
      }
      const { data: profiles, error: profilesLoadError } = await supabase
        .from('profiles')
        .select('id,display_name,avatar_url')
        .in('id', userIds);

      if (profilesLoadError) {
        if (!cancelled) {
          setMembers([]);
          setMembersError('Unable to load member profiles. Please try again.');
        }
        return;
      }

      const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
      if (!cancelled) {
        setMembers(
          memberRows.map(member => ({
            ...member,
            profile: profilesById.get(member.user_id),
          }))
        );
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
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
    const values = new FormData(event.currentTarget);
    const email = values.get('email').toString().trim().toLowerCase();
    const role = values.get('role').toString();
    const token = crypto.randomUUID();
    setBusy(true);
    setMessage('');
    const { data, error } = await supabase
      .from('space_invitations')
      .insert({
        space_id: activeSpace.id,
        created_by: user.id,
        invited_email: email,
        role,
        token_hash: await invitationTokenHash(token),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select('id')
      .single();
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    const invitationLink = `${window.location.origin}/invite?token=${encodeURIComponent(token)}`;
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

  async function updateMember(member, updates, successMessage) {
    if (!activeSpace || memberActionId) return;

    setMemberActionId(member.user_id);
    setMemberMenuId(null);
    setMessage('');
    const { data, error } = await supabase
      .from('space_members')
      .update(updates)
      .eq('space_id', activeSpace.id)
      .eq('user_id', member.user_id)
      .select('user_id,role,status,revoked_at')
      .single();

    if (error || !data) {
      setMessage(error?.message ?? 'Unable to update member. Please try again.');
      setMemberActionId(null);
      return false;
    }

    setMembers(current =>
      data.status === 'active'
        ? current.map(item => (item.user_id === data.user_id ? { ...item, ...data } : item))
        : current.filter(item => item.user_id !== data.user_id)
    );
    setMessage(successMessage);
    setMemberActionId(null);
    return true;
  }

  function handleRoleChange(member, role) {
    updateMember(member, { role, revoked_at: null }, 'Member role updated.');
  }

  function handleRemoveMember(member) {
    updateMember(
      member,
      { status: 'revoked', revoked_at: new Date().toISOString() },
      'Member removed from this space.'
    );
  }

  async function handleLeaveSpace() {
    const currentMember = members.find(member => member.user_id === user?.id);
    if (!currentMember || currentMember.role === 'admin') return;

    const leftSpace = await updateMember(
      currentMember,
      { status: 'revoked', revoked_at: new Date().toISOString() },
      'You left this space.'
    );
    if (leftSpace) await refreshSpaces();
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
        <div className="overflow-hidden rounded-lg bg-light py-1.5 dark:bg-neutral-800">
          {members.map(member => {
            const memberName = member.profile?.display_name ?? member.user_id;
            const isCurrentUser = member.user_id === user?.id;
            const canManageMember = canManageSpace && !isCurrentUser;
            const isUpdating = memberActionId === member.user_id;
            const memberActions = [
              member.role !== 'collaborator' && {
                label: 'Make collaborator',
                onClick: () => handleRoleChange(member, 'collaborator'),
              },
              member.role !== 'viewer' && {
                label: 'Make viewer',
                onClick: () => handleRoleChange(member, 'viewer'),
              },
              {
                label: 'Remove member',
                onClick: () => handleRemoveMember(member),
              },
            ].filter(Boolean);

            return (
              <div
                key={member.user_id}
                className="relative flex items-center gap-3 border-b border-dark/10 px-4 py-3 last:border-b-0 dark:border-white/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ocean-blue font-semibold text-white">
                  {memberName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 grow">
                  <p className="truncate text-sm font-semibold md:text-base">{memberName}</p>
                  <p className="text-xs capitalize text-dark/70 dark:text-white/70">
                    {member.role}
                  </p>
                </div>
                {canManageMember && (
                  <button
                    type="button"
                    aria-label={`Manage ${memberName}`}
                    disabled={isUpdating}
                    onClick={() =>
                      setMemberMenuId(current =>
                        current === member.user_id ? null : member.user_id
                      )
                    }
                    className="rounded p-1 text-dark/80 transition-colors hover:bg-dark/10 disabled:opacity-50 dark:text-white/80 dark:hover:bg-white/10"
                  >
                    <MoreIcon className="text-xl" />
                  </button>
                )}
                {canManageMember && (
                  <ContextMenu
                    items={memberActions}
                    show={memberMenuId === member.user_id}
                    hideFn={() => setMemberMenuId(null)}
                    hideOnItemClick
                    position={{ bottom: -2, right: 8 }}
                  />
                )}
              </div>
            );
          })}
        </div>
        {membersError && <p className="text-sm text-red-500">{membersError}</p>}
        {!canManageSpace && (
          <Button
            label={memberActionId === user?.id ? 'Leavingâ€¦' : 'Leave space'}
            style="danger"
            contained
            onClick={handleLeaveSpace}
          />
        )}
      </section>
      {canManageSpace && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Invite someone</h2>
          <form className="flex flex-col gap-3" onSubmit={handleInvite}>
            <InputField name="email" type="email" label="Google account email" required />
            <label className="flex flex-col gap-2 text-sm font-semibold">
              <span>Role</span>
              <span className="relative">
                <select
                  name="role"
                  className="w-full appearance-none rounded-md border border-deep-blue bg-transparent px-3 py-2 pr-10 text-sm text-dark outline-none transition-colors focus:border-sky-blue dark:border-ocean-blue/60 dark:text-white"
                >
                  <option
                    className="bg-light text-dark dark:bg-neutral-800 dark:text-white"
                    value="viewer"
                  >
                    Viewer
                  </option>
                  <option
                    className="bg-light text-dark dark:bg-neutral-800 dark:text-white"
                    value="collaborator"
                  >
                    Collaborator
                  </option>
                </select>
                <DownIcon
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ocean-blue dark:text-white"
                />
              </span>
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
