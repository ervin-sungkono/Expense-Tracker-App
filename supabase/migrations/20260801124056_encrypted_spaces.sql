create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create sequence if not exists public.space_revision_seq;

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null check (char_length(trim(display_name)) between 1 and 80),
    avatar_url text,
    active_key_version integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.user_public_keys (
    user_id uuid not null references auth.users(id) on delete cascade,
    key_version integer not null check (key_version > 0),
    algorithm text not null check (algorithm = 'RSA-OAEP-3072-SHA256'),
    public_key_jwk jsonb not null,
    fingerprint text not null,
    created_at timestamptz not null default now(),
    revoked_at timestamptz,
    primary key (user_id, key_version)
);

create table public.user_private_key_backups (
    user_id uuid not null references auth.users(id) on delete cascade,
    key_version integer not null check (key_version > 0),
    encrypted_private_key bytea not null,
    iv bytea not null,
    salt bytea not null,
    kdf_algorithm text not null check (kdf_algorithm = 'PBKDF2-HMAC-SHA256'),
    kdf_iterations integer not null check (kdf_iterations >= 600000),
    key_algorithm text not null check (key_algorithm = 'RSA-OAEP-3072-SHA256'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, key_version)
);

create table public.spaces (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(trim(name)) between 1 and 60),
    current_key_version integer not null default 1 check (current_key_version > 0),
    pending_key_version integer,
    rotation_status text not null default 'idle' check (rotation_status in ('idle', 'required', 'in_progress')),
    rotation_started_at timestamptz,
    deleting_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (
        (rotation_status = 'in_progress' and pending_key_version is not null)
        or (rotation_status <> 'in_progress')
    )
);

create table public.space_members (
    space_id uuid not null references public.spaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('admin', 'collaborator', 'viewer')),
    status text not null default 'active' check (status in ('active', 'revoked_pending_rotation')),
    joined_at timestamptz not null default now(),
    revoked_at timestamptz,
    primary key (space_id, user_id)
);

create unique index space_members_one_admin_idx
    on public.space_members (space_id)
    where role = 'admin';
create index space_members_user_space_idx on public.space_members (user_id, space_id) where status = 'active';

create table public.space_member_keys (
    space_id uuid not null references public.spaces(id) on delete cascade,
    user_id uuid not null,
    space_key_version integer not null check (space_key_version > 0),
    user_key_version integer not null check (user_key_version > 0),
    wrapped_space_key bytea not null,
    wrap_algorithm text not null check (wrap_algorithm = 'RSA-OAEP-3072-SHA256'),
    created_at timestamptz not null default now(),
    primary key (space_id, user_id, space_key_version),
    foreign key (space_id, user_id) references public.space_members(space_id, user_id) on delete cascade,
    foreign key (user_id, user_key_version) references public.user_public_keys(user_id, key_version)
);
create index space_member_keys_user_idx on public.space_member_keys (user_id, space_id);

create table public.space_records (
    id uuid primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    entity_type text not null check (entity_type in ('transaction', 'category', 'shop', 'budget')),
    ciphertext bytea,
    iv bytea,
    crypto_version integer not null default 1 check (crypto_version > 0),
    payload_schema_version integer not null default 1 check (payload_schema_version > 0),
    space_key_version integer not null check (space_key_version > 0),
    version bigint not null default 1 check (version > 0),
    server_revision bigint not null default nextval('public.space_revision_seq'),
    last_mutation_id uuid not null,
    created_by uuid not null references auth.users(id),
    updated_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    check ((deleted_at is not null) or (ciphertext is not null and iv is not null))
);
create index space_records_sync_idx on public.space_records (space_id, server_revision);
create index space_records_entity_idx on public.space_records (space_id, entity_type, deleted_at);
create index space_records_created_by_idx on public.space_records (created_by);
create index space_records_updated_by_idx on public.space_records (updated_by);

create table public.space_assets (
    id uuid primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    object_path text not null unique,
    key_version integer not null check (key_version > 0),
    crypto_version integer not null default 1 check (crypto_version > 0),
    iv bytea not null,
    version bigint not null default 1 check (version > 0),
    server_revision bigint not null default nextval('public.space_revision_seq'),
    last_mutation_id uuid not null,
    created_by uuid not null references auth.users(id),
    updated_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);
create index space_assets_sync_idx on public.space_assets (space_id, server_revision);
create index space_assets_created_by_idx on public.space_assets (created_by);
create index space_assets_updated_by_idx on public.space_assets (updated_by);

create table public.space_invitations (
    id uuid primary key default gen_random_uuid(),
    space_id uuid not null references public.spaces(id) on delete cascade,
    created_by uuid not null references auth.users(id),
    invited_email text not null check (invited_email = lower(trim(invited_email))),
    role text not null check (role in ('collaborator', 'viewer')),
    token_hash bytea not null unique,
    encrypted_space_key bytea not null,
    key_iv bytea not null,
    space_key_version integer not null check (space_key_version > 0),
    expires_at timestamptz not null,
    accepted_by uuid references auth.users(id),
    accepted_at timestamptz,
    revoked_at timestamptz,
    last_sent_at timestamptz,
    created_at timestamptz not null default now(),
    check (expires_at > created_at)
);
create index space_invitations_space_idx on public.space_invitations (space_id, created_at desc);
create index space_invitations_email_idx on public.space_invitations (invited_email) where accepted_at is null and revoked_at is null;

create or replace function private.is_active_space_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.space_members
        where space_id = target_space_id
          and user_id = (select auth.uid())
          and status = 'active'
    );
$$;

create or replace function private.current_space_role(target_space_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select role from public.space_members
    where space_id = target_space_id
      and user_id = (select auth.uid())
      and status = 'active';
$$;

create or replace function private.is_space_owner(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.spaces
        where id = target_space_id and owner_id = (select auth.uid()) and deleting_at is null
    );
$$;

create or replace function private.users_share_space(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.space_members mine
        join public.space_members theirs on theirs.space_id = mine.space_id
        where mine.user_id = (select auth.uid())
          and mine.status = 'active'
          and theirs.user_id = other_user_id
          and theirs.status = 'active'
    );
$$;

create or replace function private.safe_uuid(value text)
returns uuid
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
    return value::uuid;
exception when invalid_text_representation then
    return null;
end;
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function private.version_space_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'UPDATE' then
        new.version = old.version + 1;
        new.created_by = old.created_by;
        new.created_at = old.created_at;
    end if;
    new.updated_by = (select auth.uid());
    new.updated_at = now();
    new.server_revision = nextval('public.space_revision_seq');
    return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger private_key_backups_touch before update on public.user_private_key_backups
for each row execute function private.touch_updated_at();
create trigger spaces_touch before update on public.spaces
for each row execute function private.touch_updated_at();
create trigger space_records_version before update on public.space_records
for each row execute function private.version_space_record();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name, avatar_url)
    values (
        new.id,
        coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, 'Xpensed user'), '@', 1)),
        nullif(new.raw_user_meta_data ->> 'avatar_url', '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function public.create_space(
    space_name text,
    owner_wrapped_key_base64 text,
    owner_user_key_version integer default 1
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
        select 1 from public.user_public_keys where user_id = caller_id and key_version = owner_user_key_version and revoked_at is null
    ) then raise exception 'Active user public key is required' using errcode = '23503'; end if;

    insert into public.spaces (owner_id, name) values (caller_id, trim(space_name)) returning * into created_space;
    insert into public.space_members (space_id, user_id, role) values (created_space.id, caller_id, 'admin');
    insert into public.space_member_keys (
        space_id, user_id, space_key_version, user_key_version, wrapped_space_key, wrap_algorithm
    ) values (
        created_space.id, caller_id, 1, owner_user_key_version, decode(owner_wrapped_key_base64, 'base64'), 'RSA-OAEP-3072-SHA256'
    );
    return created_space;
end;
$$;

create or replace function public.apply_space_mutations(mutations jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    item jsonb;
    existing public.space_records;
    caller_role text;
    results jsonb := '[]'::jsonb;
begin
    if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '28000'; end if;
    if jsonb_typeof(mutations) <> 'array' or jsonb_array_length(mutations) = 0 then
        raise exception 'Mutations must be a non-empty array' using errcode = '22023';
    end if;

    for item in select * from jsonb_array_elements(mutations) loop
        caller_role := private.current_space_role((item ->> 'space_id')::uuid);
        if caller_role is null then raise exception 'Space access denied' using errcode = '42501'; end if;
        if (select rotation_status from public.spaces where id = (item ->> 'space_id')::uuid) <> 'idle' then
            raise exception 'Space key rotation is in progress' using errcode = '55000';
        end if;
        if item ->> 'operation' <> 'delete' and (item ->> 'key_version')::integer <>
            (select current_key_version from public.spaces where id = (item ->> 'space_id')::uuid) then
            raise exception 'Mutation uses an inactive space key' using errcode = '22023';
        end if;
        if caller_role = 'viewer' or (caller_role = 'collaborator' and item ->> 'entity_type' <> 'transaction') then
            raise exception 'Role cannot mutate this entity' using errcode = '42501';
        end if;

        select * into existing from public.space_records where id = (item ->> 'record_id')::uuid for update;
        if found and existing.last_mutation_id = (item ->> 'mutation_id')::uuid then continue; end if;
        if found and existing.version <> coalesce((item ->> 'base_version')::bigint, 0) then
            raise exception 'Version conflict for record %', item ->> 'record_id' using errcode = '40001';
        end if;
        if not found and coalesce((item ->> 'base_version')::bigint, 0) <> 0 then
            raise exception 'Missing record conflict for %', item ->> 'record_id' using errcode = '40001';
        end if;
    end loop;

    for item in select * from jsonb_array_elements(mutations) loop
        select * into existing from public.space_records where id = (item ->> 'record_id')::uuid;
        if found and existing.last_mutation_id = (item ->> 'mutation_id')::uuid then
            results := results || jsonb_build_array(jsonb_build_object('id', existing.id, 'version', existing.version, 'server_revision', existing.server_revision));
            continue;
        end if;

        if item ->> 'operation' = 'delete' then
            update public.space_records
            set ciphertext = null, iv = null, deleted_at = now(), last_mutation_id = (item ->> 'mutation_id')::uuid
            where id = (item ->> 'record_id')::uuid
            returning * into existing;
        elsif existing.id is null then
            insert into public.space_records (
                id, space_id, entity_type, ciphertext, iv, crypto_version, payload_schema_version,
                space_key_version, last_mutation_id, created_by, updated_by
            ) values (
                (item ->> 'record_id')::uuid, (item ->> 'space_id')::uuid, item ->> 'entity_type',
                decode(item ->> 'ciphertext', 'base64'), decode(item ->> 'iv', 'base64'),
                (item ->> 'crypto_version')::integer, (item ->> 'schema_version')::integer,
                (item ->> 'key_version')::integer, (item ->> 'mutation_id')::uuid,
                (select auth.uid()), (select auth.uid())
            ) returning * into existing;
        else
            update public.space_records set
                ciphertext = decode(item ->> 'ciphertext', 'base64'),
                iv = decode(item ->> 'iv', 'base64'),
                crypto_version = (item ->> 'crypto_version')::integer,
                payload_schema_version = (item ->> 'schema_version')::integer,
                space_key_version = (item ->> 'key_version')::integer,
                last_mutation_id = (item ->> 'mutation_id')::uuid,
                deleted_at = null
            where id = (item ->> 'record_id')::uuid
            returning * into existing;
        end if;
        results := results || jsonb_build_array(jsonb_build_object('id', existing.id, 'version', existing.version, 'server_revision', existing.server_revision));
    end loop;
    return results;
end;
$$;

create or replace function public.accept_space_invitation(
    invitation_token_hash_base64 text,
    recipient_user_id uuid,
    recipient_email text,
    recipient_wrapped_key_base64 text,
    recipient_user_key_version integer
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
    if not exists (select 1 from public.user_public_keys where user_id = recipient_user_id and key_version = recipient_user_key_version and revoked_at is null) then
        raise exception 'Recipient public key is unavailable' using errcode = '23503';
    end if;

    insert into public.space_members (space_id, user_id, role)
    values (invitation.space_id, recipient_user_id, invitation.role) returning * into membership;
    insert into public.space_member_keys (
        space_id, user_id, space_key_version, user_key_version, wrapped_space_key, wrap_algorithm
    ) values (
        invitation.space_id, recipient_user_id, invitation.space_key_version, recipient_user_key_version,
        decode(recipient_wrapped_key_base64, 'base64'), 'RSA-OAEP-3072-SHA256'
    );
    update public.space_invitations set accepted_by = recipient_user_id, accepted_at = now() where id = invitation.id;
    return membership;
end;
$$;

alter table public.profiles enable row level security;
alter table public.user_public_keys enable row level security;
alter table public.user_private_key_backups enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_member_keys enable row level security;
alter table public.space_records enable row level security;
alter table public.space_assets enable row level security;
alter table public.space_invitations enable row level security;

create policy profiles_select on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.users_share_space(id));
create policy profiles_update on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy public_keys_select on public.user_public_keys for select to authenticated
using (user_id = (select auth.uid()) or private.users_share_space(user_id));
create policy public_keys_insert on public.user_public_keys for insert to authenticated
with check (user_id = (select auth.uid()));
create policy public_keys_update on public.user_public_keys for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy private_backups_select on public.user_private_key_backups for select to authenticated
using (user_id = (select auth.uid()));
create policy private_backups_insert on public.user_private_key_backups for insert to authenticated
with check (user_id = (select auth.uid()));
create policy private_backups_update on public.user_private_key_backups for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy spaces_select on public.spaces for select to authenticated
using (private.is_active_space_member(id));
create policy spaces_update on public.spaces for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy members_select on public.space_members for select to authenticated
using (private.is_active_space_member(space_id));
create policy member_keys_select on public.space_member_keys for select to authenticated
using (user_id = (select auth.uid()) and private.is_active_space_member(space_id));
create policy member_keys_insert on public.space_member_keys for insert to authenticated
with check (private.is_space_owner(space_id));

create policy records_select on public.space_records for select to authenticated
using (private.is_active_space_member(space_id));
create policy records_insert on public.space_records for insert to authenticated
with check (
    private.current_space_role(space_id) = 'admin'
    or (private.current_space_role(space_id) = 'collaborator' and entity_type = 'transaction')
);
create policy records_update on public.space_records for update to authenticated
using (
    private.current_space_role(space_id) = 'admin'
    or (private.current_space_role(space_id) = 'collaborator' and entity_type = 'transaction')
) with check (
    private.current_space_role(space_id) = 'admin'
    or (private.current_space_role(space_id) = 'collaborator' and entity_type = 'transaction')
);

create policy assets_select on public.space_assets for select to authenticated
using (private.is_active_space_member(space_id));
create policy assets_insert on public.space_assets for insert to authenticated
with check (private.is_space_owner(space_id));
create policy assets_update on public.space_assets for update to authenticated
using (private.is_space_owner(space_id)) with check (private.is_space_owner(space_id));

create policy invitations_select on public.space_invitations for select to authenticated
using (private.is_space_owner(space_id));
create policy invitations_insert on public.space_invitations for insert to authenticated
with check (created_by = (select auth.uid()) and private.is_space_owner(space_id));
create policy invitations_update on public.space_invitations for update to authenticated
using (private.is_space_owner(space_id)) with check (private.is_space_owner(space_id));

insert into storage.buckets (id, name, public, file_size_limit)
values ('space-assets', 'space-assets', false, 2097152)
on conflict (id) do update set public = false, file_size_limit = 2097152;

create policy space_assets_objects_select on storage.objects for select to authenticated
using (
    bucket_id = 'space-assets'
    and private.is_active_space_member(private.safe_uuid((storage.foldername(name))[1]))
);
create policy space_assets_objects_insert on storage.objects for insert to authenticated
with check (
    bucket_id = 'space-assets'
    and private.is_space_owner(private.safe_uuid((storage.foldername(name))[1]))
);
create policy space_assets_objects_delete on storage.objects for delete to authenticated
using (
    bucket_id = 'space-assets'
    and private.is_space_owner(private.safe_uuid((storage.foldername(name))[1]))
);

revoke all on all tables in schema public from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_public_keys to authenticated;
grant select, insert, update on public.user_private_key_backups to authenticated;
grant select, update on public.spaces to authenticated;
grant select on public.space_members to authenticated;
grant select, insert on public.space_member_keys to authenticated;
grant select, insert, update on public.space_records to authenticated;
grant select, insert, update on public.space_assets to authenticated;
grant select, insert, update on public.space_invitations to authenticated;
grant usage, select on sequence public.space_revision_seq to authenticated;

revoke execute on function public.create_space(text, text, integer) from public, anon;
grant execute on function public.create_space(text, text, integer) to authenticated;
revoke execute on function public.apply_space_mutations(jsonb) from public, anon;
grant execute on function public.apply_space_mutations(jsonb) to authenticated;
revoke execute on function public.accept_space_invitation(text, uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.accept_space_invitation(text, uuid, text, text, integer) to service_role;

grant execute on function private.is_active_space_member(uuid) to authenticated, service_role;
grant execute on function private.current_space_role(uuid) to authenticated, service_role;
grant execute on function private.is_space_owner(uuid) to authenticated, service_role;
grant execute on function private.users_share_space(uuid) to authenticated, service_role;
grant execute on function private.safe_uuid(text) to authenticated, service_role;
