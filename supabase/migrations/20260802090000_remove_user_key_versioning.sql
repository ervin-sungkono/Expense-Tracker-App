drop function if exists public.create_space(text, text, integer);
drop function if exists public.accept_space_invitation(text, uuid, text, text, integer);

drop index if exists public.space_member_keys_user_key_idx;

alter table public.space_member_keys
    drop constraint if exists space_member_keys_user_id_user_key_version_fkey,
    drop column user_key_version;

alter table public.user_public_keys
    drop constraint user_public_keys_pkey,
    drop column key_version,
    add primary key (user_id);

alter table public.profiles drop column active_key_version;

create function public.create_space(
    space_name text,
    owner_wrapped_key_base64 text
)
returns public.spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
    caller_id uuid := (select auth.uid());
    created_space public.spaces;
begin
    if caller_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
    if char_length(trim(space_name)) not between 1 and 60 then raise exception 'Invalid space name' using errcode = '22023'; end if;

    perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));
    if (select count(*) from public.spaces where owner_id = caller_id and deleting_at is null) >= 3 then
        raise exception 'A user may own at most three spaces' using errcode = '23514';
    end if;
    if not exists (
        select 1 from public.user_public_keys where user_id = caller_id and revoked_at is null
    ) then raise exception 'User public key is required' using errcode = '23503'; end if;

    insert into public.spaces (owner_id, name) values (caller_id, trim(space_name)) returning * into created_space;
    insert into public.space_members (space_id, user_id, role) values (created_space.id, caller_id, 'admin');
    insert into public.space_member_keys (
        space_id, user_id, space_key_version, wrapped_space_key, wrap_algorithm
    ) values (
        created_space.id, caller_id, 1, decode(owner_wrapped_key_base64, 'base64'), 'RSA-OAEP-3072-SHA256'
    );
    return created_space;
end;
$$;

create function public.accept_space_invitation(
    invitation_token_hash_base64 text,
    recipient_user_id uuid,
    recipient_email text,
    recipient_wrapped_key_base64 text
)
returns public.space_members
language plpgsql
security definer
set search_path = ''
as $$
declare
    invitation public.space_invitations;
    membership public.space_members;
begin
    select * into invitation from public.space_invitations
    where token_hash = decode(invitation_token_hash_base64, 'base64') for update;
    if invitation.id is null or invitation.revoked_at is not null or invitation.accepted_at is not null or invitation.expires_at <= now() then
        raise exception 'Invitation is invalid or expired' using errcode = '22023';
    end if;
    if lower(trim(recipient_email)) <> invitation.invited_email then
        raise exception 'Invitation email does not match' using errcode = '42501';
    end if;
    if exists (select 1 from public.space_members where space_id = invitation.space_id and user_id = recipient_user_id) then
        raise exception 'User is already a member' using errcode = '23505';
    end if;
    if not exists (select 1 from public.user_public_keys where user_id = recipient_user_id and revoked_at is null) then
        raise exception 'Recipient public key is unavailable' using errcode = '23503';
    end if;

    insert into public.space_members (space_id, user_id, role)
    values (invitation.space_id, recipient_user_id, invitation.role) returning * into membership;
    insert into public.space_member_keys (
        space_id, user_id, space_key_version, wrapped_space_key, wrap_algorithm
    ) values (
        invitation.space_id, recipient_user_id, invitation.space_key_version,
        decode(recipient_wrapped_key_base64, 'base64'), 'RSA-OAEP-3072-SHA256'
    );
    update public.space_invitations set accepted_by = recipient_user_id, accepted_at = now() where id = invitation.id;
    return membership;
end;
$$;

revoke all on function public.create_space(text, text) from public;
grant execute on function public.create_space(text, text) to authenticated;

revoke execute on function public.accept_space_invitation(text, uuid, text, text)
    from public, anon, authenticated;
grant execute on function public.accept_space_invitation(text, uuid, text, text) to service_role;
