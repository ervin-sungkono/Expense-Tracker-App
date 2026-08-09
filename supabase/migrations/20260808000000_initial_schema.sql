create extension if not exists pgcrypto with schema extensions;

create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create sequence public.space_revision_seq;

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null check (char_length(trim(display_name)) between 1 and 80),
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.spaces (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(trim(name)) between 1 and 60),
    deleting_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index spaces_owner_id_idx on public.spaces (owner_id) where deleting_at is null;

create table public.space_members (
    space_id uuid not null references public.spaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('admin', 'collaborator', 'viewer')),
    status text not null default 'active' check (status in ('active', 'revoked')),
    joined_at timestamptz not null default now(),
    revoked_at timestamptz,
    primary key (space_id, user_id)
);
create unique index space_members_one_admin_idx on public.space_members (space_id) where role = 'admin';
create index space_members_user_space_idx on public.space_members (user_id, space_id) where status = 'active';

create table public.space_records (
    id uuid primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    entity_type text not null check (entity_type in ('transaction', 'category', 'shop', 'budget')),
    payload jsonb,
    version bigint not null default 1 check (version > 0),
    server_revision bigint not null default nextval('public.space_revision_seq'),
    last_mutation_id uuid not null,
    created_by uuid not null references auth.users(id),
    updated_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    check (deleted_at is not null or payload is not null)
);
create index space_records_sync_idx on public.space_records (space_id, server_revision);
create index space_records_entity_idx on public.space_records (space_id, entity_type, deleted_at);

create table public.space_invitations (
    id uuid primary key default gen_random_uuid(),
    space_id uuid not null references public.spaces(id) on delete cascade,
    created_by uuid not null references auth.users(id),
    invited_email text not null check (invited_email = lower(trim(invited_email))),
    role text not null check (role in ('collaborator', 'viewer')),
    token_hash bytea not null unique,
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

create function private.is_active_space_member(target_space_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.space_members
        where space_id = target_space_id and user_id = (select auth.uid()) and status = 'active'
    );
$$;

create function private.current_space_role(target_space_id uuid)
returns text language sql stable security definer set search_path = '' as $$
    select role from public.space_members
    where space_id = target_space_id and user_id = (select auth.uid()) and status = 'active';
$$;

create function private.is_space_owner(target_space_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.spaces
        where id = target_space_id and owner_id = (select auth.uid()) and deleting_at is null
    );
$$;

create function private.users_share_space(other_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (
        select 1
        from public.space_members mine
        join public.space_members theirs on theirs.space_id = mine.space_id
        where mine.user_id = (select auth.uid()) and mine.status = 'active'
          and theirs.user_id = other_user_id and theirs.status = 'active'
    );
$$;

create function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create function private.version_space_record()
returns trigger language plpgsql set search_path = '' as $$
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

create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger spaces_touch before update on public.spaces for each row execute function private.touch_updated_at();
create trigger space_records_version before update on public.space_records for each row execute function private.version_space_record();

create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.profiles (id, display_name, avatar_url)
    values (
        new.id,
        coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, 'Xpensed user'), '@', 1)),
        nullif(new.raw_user_meta_data ->> 'avatar_url', '')
    ) on conflict (id) do nothing;
    return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create function public.create_space(space_name text)
returns public.spaces language plpgsql security definer set search_path = '' as $$
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
    insert into public.spaces (owner_id, name) values (caller_id, trim(space_name)) returning * into created_space;
    insert into public.space_members (space_id, user_id, role) values (created_space.id, caller_id, 'admin');
    return created_space;
end;
$$;

create function public.apply_space_mutations(mutations jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
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
        if caller_role = 'viewer' or (caller_role = 'collaborator' and item ->> 'entity_type' <> 'transaction') then
            raise exception 'Role cannot mutate this entity' using errcode = '42501';
        end if;
        if item ->> 'operation' <> 'delete' and coalesce(jsonb_typeof(item -> 'payload'), '') <> 'object' then
            raise exception 'Mutation payload must be an object' using errcode = '22023';
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
            update public.space_records set payload = null, deleted_at = now(), last_mutation_id = (item ->> 'mutation_id')::uuid
            where id = (item ->> 'record_id')::uuid returning * into existing;
        elsif existing.id is null then
            insert into public.space_records (id, space_id, entity_type, payload, last_mutation_id, created_by, updated_by)
            values ((item ->> 'record_id')::uuid, (item ->> 'space_id')::uuid, item ->> 'entity_type', item -> 'payload', (item ->> 'mutation_id')::uuid, (select auth.uid()), (select auth.uid()))
            returning * into existing;
        else
            update public.space_records set payload = item -> 'payload', last_mutation_id = (item ->> 'mutation_id')::uuid, deleted_at = null
            where id = (item ->> 'record_id')::uuid returning * into existing;
        end if;
        results := results || jsonb_build_array(jsonb_build_object('id', existing.id, 'version', existing.version, 'server_revision', existing.server_revision));
    end loop;
    return results;
end;
$$;

create function public.accept_space_invitation(invitation_token_hash_base64 text, recipient_user_id uuid, recipient_email text)
returns public.space_members language plpgsql security definer set search_path = '' as $$
declare
    invitation public.space_invitations;
    membership public.space_members;
begin
    select * into invitation from public.space_invitations where token_hash = decode(invitation_token_hash_base64, 'base64') for update;
    if invitation.id is null or invitation.revoked_at is not null or invitation.accepted_at is not null or invitation.expires_at <= now() then
        raise exception 'Invitation is invalid or expired' using errcode = '22023';
    end if;
    if lower(trim(recipient_email)) <> invitation.invited_email then raise exception 'Invitation email does not match' using errcode = '42501'; end if;
    if exists (select 1 from public.space_members where space_id = invitation.space_id and user_id = recipient_user_id) then
        raise exception 'User is already a member' using errcode = '23505';
    end if;
    insert into public.space_members (space_id, user_id, role) values (invitation.space_id, recipient_user_id, invitation.role) returning * into membership;
    update public.space_invitations set accepted_by = recipient_user_id, accepted_at = now() where id = invitation.id;
    return membership;
end;
$$;

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_records enable row level security;
alter table public.space_invitations enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()) or private.users_share_space(id));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy spaces_select on public.spaces for select to authenticated using (private.is_active_space_member(id));
create policy spaces_update on public.spaces for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy members_select on public.space_members for select to authenticated using (private.is_active_space_member(space_id));
create policy members_manage on public.space_members for update to authenticated using (private.is_space_owner(space_id) and user_id <> (select auth.uid())) with check (private.is_space_owner(space_id) and user_id <> (select auth.uid()));
create policy members_leave on public.space_members for update to authenticated using (user_id = (select auth.uid()) and role <> 'admin' and status = 'active') with check (user_id = (select auth.uid()) and role <> 'admin' and status = 'revoked' and revoked_at is not null);
create policy records_select on public.space_records for select to authenticated using (
    private.is_active_space_member(space_id)
    and (
        auth.jwt() ->> 'client_id' is null
        or entity_type in ('transaction', 'category', 'shop')
    )
);
create policy records_insert on public.space_records for insert to authenticated with check (
    auth.jwt() ->> 'client_id' is null
    and (
        private.current_space_role(space_id) = 'admin'
        or (private.current_space_role(space_id) = 'collaborator' and entity_type = 'transaction')
    )
);
create policy records_update on public.space_records for update to authenticated using (
    auth.jwt() ->> 'client_id' is null
    and (
        private.current_space_role(space_id) = 'admin'
        or (private.current_space_role(space_id) = 'collaborator' and entity_type = 'transaction')
    )
) with check (
    auth.jwt() ->> 'client_id' is null
    and (
        private.current_space_role(space_id) = 'admin'
        or (private.current_space_role(space_id) = 'collaborator' and entity_type = 'transaction')
    )
);
create policy invitations_select on public.space_invitations for select to authenticated using (private.is_space_owner(space_id));
create policy invitations_insert on public.space_invitations for insert to authenticated with check (created_by = (select auth.uid()) and private.is_space_owner(space_id));
create policy invitations_update on public.space_invitations for update to authenticated using (private.is_space_owner(space_id)) with check (private.is_space_owner(space_id));

revoke all on all tables in schema public from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, update on public.spaces to authenticated;
grant select, update on public.space_members to authenticated;
grant select, insert, update on public.space_records to authenticated;
grant select, insert, update on public.space_invitations to authenticated;
grant usage, select on sequence public.space_revision_seq to authenticated;

revoke execute on function public.create_space(text) from public, anon;
grant execute on function public.create_space(text) to authenticated;
revoke execute on function public.apply_space_mutations(jsonb) from public, anon;
grant execute on function public.apply_space_mutations(jsonb) to authenticated;
revoke execute on function public.accept_space_invitation(text, uuid, text) from public, anon, authenticated;
grant execute on function public.accept_space_invitation(text, uuid, text) to service_role;

grant execute on function private.is_active_space_member(uuid) to authenticated, service_role;
grant execute on function private.current_space_role(uuid) to authenticated, service_role;
grant execute on function private.is_space_owner(uuid) to authenticated, service_role;
grant execute on function private.users_share_space(uuid) to authenticated, service_role;

-- MCP-backed Gmail imports and shared API abuse protection.
create table public.transaction_sources (
    id uuid primary key default gen_random_uuid(),
    space_id uuid not null references public.spaces(id) on delete cascade,
    transaction_id uuid not null unique references public.space_records(id) on delete restrict,
    imported_by uuid not null references auth.users(id) on delete cascade,
    provider text not null check (provider = 'gmail'),
    source_id text not null check (char_length(source_id) between 1 and 512),
    merchant text not null check (char_length(trim(merchant)) between 1 and 120),
    currency text not null default 'IDR' check (currency = 'IDR'),
    created_at timestamptz not null default now(),
    unique (space_id, imported_by, provider, source_id)
);
create index transaction_sources_lookup_idx
    on public.transaction_sources (space_id, imported_by, provider, source_id);

alter table public.transaction_sources enable row level security;
create policy transaction_sources_select on public.transaction_sources
    for select to authenticated
    using (imported_by = (select auth.uid()) and private.is_active_space_member(space_id));

revoke all on public.transaction_sources from public, anon, authenticated;
grant select on public.transaction_sources to authenticated;

create table private.api_rate_limits (
    bucket_hash text primary key check (bucket_hash ~ '^[0-9a-f]{64}$'),
    window_started_at timestamptz not null,
    request_count integer not null check (request_count > 0),
    updated_at timestamptz not null default now()
);
create index api_rate_limits_window_idx on private.api_rate_limits (window_started_at);
revoke all on private.api_rate_limits from public, anon, authenticated, service_role;

create function public.consume_api_rate_limit(
    target_bucket_hash text,
    max_requests integer,
    window_seconds integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    bucket private.api_rate_limits;
    now_at timestamptz := clock_timestamp();
    retry_after integer;
    request_allowed boolean := true;
begin
    if target_bucket_hash !~ '^[0-9a-f]{64}$'
       or max_requests not between 1 and 10000
       or window_seconds not between 1 and 86400 then
        raise exception 'Invalid rate limit parameters' using errcode = '22023';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(target_bucket_hash, 0));

    select * into bucket
    from private.api_rate_limits
    where bucket_hash = target_bucket_hash
    for update;

    if not found then
        insert into private.api_rate_limits (bucket_hash, window_started_at, request_count)
        values (target_bucket_hash, now_at, 1)
        returning * into bucket;
    elsif bucket.window_started_at + make_interval(secs => window_seconds) <= now_at then
        update private.api_rate_limits
        set window_started_at = now_at,
            request_count = 1,
            updated_at = now_at
        where bucket_hash = target_bucket_hash
        returning * into bucket;
    elsif bucket.request_count < max_requests then
        update private.api_rate_limits
        set request_count = request_count + 1,
            updated_at = now_at
        where bucket_hash = target_bucket_hash
        returning * into bucket;
    else
        request_allowed := false;
    end if;

    retry_after := greatest(
        0,
        ceil(extract(epoch from (
            bucket.window_started_at + make_interval(secs => window_seconds) - now_at
        )))::integer
    );

    return jsonb_build_object(
        'allowed', request_allowed,
        'limit', max_requests,
        'remaining', greatest(0, max_requests - bucket.request_count),
        'retry_after', retry_after
    );
end;
$$;

revoke execute on function public.consume_api_rate_limit(text, integer, integer)
    from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
    to service_role;

create function private.enforce_mcp_import_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    caller_id uuid := (select auth.uid());
    oauth_client_id text := nullif(auth.jwt() ->> 'client_id', '');
    minute_result jsonb;
    daily_result jsonb;
begin
    if caller_id is null or oauth_client_id is null then
        raise exception 'MCP OAuth token required' using errcode = '42501';
    end if;

    minute_result := public.consume_api_rate_limit(
        encode(extensions.digest(
            'mcp-import-minute:' || caller_id::text || ':' || oauth_client_id,
            'sha256'
        ), 'hex'),
        30,
        60
    );
    if not (minute_result ->> 'allowed')::boolean then
        raise exception 'MCP import rate limit exceeded' using errcode = '53300';
    end if;

    daily_result := public.consume_api_rate_limit(
        encode(extensions.digest(
            'mcp-import-daily:' || caller_id::text || ':' || oauth_client_id,
            'sha256'
        ), 'hex'),
        500,
        86400
    );
    if not (daily_result ->> 'allowed')::boolean then
        raise exception 'MCP import daily limit exceeded' using errcode = '53300';
    end if;

    return new;
end;
$$;

create trigger transaction_sources_mcp_rate_limit
    before insert on public.transaction_sources
    for each row execute function private.enforce_mcp_import_rate_limit();

create function public.import_transaction_from_email(
    target_space_id uuid,
    gmail_message_id text,
    transaction_amount numeric,
    transaction_date date,
    category_id uuid,
    merchant_name text,
    shop_id uuid default null,
    transaction_remarks text default null,
    transaction_currency text default 'IDR'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    caller_id uuid := (select auth.uid());
    caller_role text;
    existing_source public.transaction_sources;
    category_record public.space_records;
    shop_record public.space_records;
    created_transaction public.space_records;
    transaction_id uuid := gen_random_uuid();
    transaction_payload jsonb;
begin
    if caller_id is null then
        raise exception 'Authentication required' using errcode = '28000';
    end if;
    if nullif(auth.jwt() ->> 'client_id', '') is null
       or auth.jwt() ->> 'aud' <> 'https://xpensedv2.vercel.app/api/mcp' then
        raise exception 'MCP OAuth token required' using errcode = '42501';
    end if;

    caller_role := private.current_space_role(target_space_id);
    if caller_role is null or caller_role not in ('admin', 'collaborator') then
        raise exception 'Role cannot create transactions' using errcode = '42501';
    end if;

    if gmail_message_id is null or char_length(gmail_message_id) not between 1 and 512 then
        raise exception 'Gmail message ID is invalid' using errcode = '22023';
    end if;
    if transaction_amount is null or transaction_amount <= 0 or transaction_amount > 999999999999.99 then
        raise exception 'Transaction amount is invalid' using errcode = '22023';
    end if;
    if merchant_name is null or char_length(trim(merchant_name)) not between 1 and 120 then
        raise exception 'Merchant is invalid' using errcode = '22023';
    end if;
    if transaction_remarks is not null and char_length(transaction_remarks) > 120 then
        raise exception 'Remarks are too long' using errcode = '22023';
    end if;
    if transaction_currency <> 'IDR' then
        raise exception 'Only IDR is supported' using errcode = '22023';
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(
            target_space_id::text || ':' || caller_id::text || ':gmail:' || gmail_message_id,
            0
        )
    );

    select * into existing_source
    from public.transaction_sources
    where space_id = target_space_id
      and imported_by = caller_id
      and provider = 'gmail'
      and source_id = gmail_message_id;

    if found then
        return jsonb_build_object(
            'status', case
                when exists (
                    select 1 from public.space_records
                    where id = existing_source.transaction_id and deleted_at is not null
                ) then 'already_exists_deleted'
                else 'already_exists'
            end,
            'transaction_id', existing_source.transaction_id
        );
    end if;

    select * into category_record
    from public.space_records
    where id = category_id
      and space_id = target_space_id
      and entity_type = 'category'
      and deleted_at is null;

    if not found or category_record.payload ->> 'type' <> 'Expense' then
        raise exception 'An active expense category is required' using errcode = '22023';
    end if;

    if shop_id is not null then
        select * into shop_record
        from public.space_records
        where id = shop_id
          and space_id = target_space_id
          and entity_type = 'shop'
          and deleted_at is null;
        if not found then
            raise exception 'Shop was not found' using errcode = '22023';
        end if;
    end if;

    transaction_payload := jsonb_strip_nulls(jsonb_build_object(
        'amount', transaction_amount,
        'date', transaction_date::text,
        'categoryId', category_id,
        'shopId', shop_id,
        'type', 'Expense',
        'merchant', trim(merchant_name),
        'currency', transaction_currency,
        'remarks', nullif(trim(transaction_remarks), '')
    ));

    insert into public.space_records (
        id,
        space_id,
        entity_type,
        payload,
        last_mutation_id,
        created_by,
        updated_by
    ) values (
        transaction_id,
        target_space_id,
        'transaction',
        transaction_payload,
        gen_random_uuid(),
        caller_id,
        caller_id
    ) returning * into created_transaction;

    insert into public.transaction_sources (
        space_id,
        transaction_id,
        imported_by,
        provider,
        source_id,
        merchant,
        currency
    ) values (
        target_space_id,
        transaction_id,
        caller_id,
        'gmail',
        gmail_message_id,
        trim(merchant_name),
        transaction_currency
    );

    return jsonb_build_object(
        'status', 'created',
        'transaction_id', transaction_id,
        'version', created_transaction.version,
        'server_revision', created_transaction.server_revision
    );
end;
$$;

revoke execute on function public.import_transaction_from_email(
    uuid, text, numeric, date, uuid, text, uuid, text, text
) from public, anon;
grant execute on function public.import_transaction_from_email(
    uuid, text, numeric, date, uuid, text, uuid, text, text
) to authenticated;
