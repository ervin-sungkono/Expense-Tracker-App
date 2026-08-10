-- MCP transaction mutations use dedicated RPCs because OAuth-client tokens
-- intentionally cannot write space_records through the generic sync API.

create table private.mcp_transaction_idempotency (
    space_id uuid not null references public.spaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{1,128}$'),
    request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
    transaction_id uuid not null unique references public.space_records(id) on delete restrict,
    created_at timestamptz not null default now(),
    primary key (space_id, user_id, idempotency_key)
);
alter table private.mcp_transaction_idempotency enable row level security;
revoke all on private.mcp_transaction_idempotency from public, anon, authenticated, service_role;

create function private.mcp_transaction_item(record public.space_records)
returns jsonb language sql stable set search_path = '' as $$
    select jsonb_build_object(
        'id', record.id,
        'version', record.version,
        'server_revision', record.server_revision,
        'status', case when record.deleted_at is null then 'active' else 'archived' end,
        'date', record.payload ->> 'date',
        'amount', record.payload -> 'amount',
        'type', record.payload ->> 'type',
        'category_id', record.payload ->> 'categoryId',
        'shop_id', record.payload -> 'shopId',
        'merchant', record.payload ->> 'merchant',
        'currency', record.payload ->> 'currency',
        'remarks', record.payload -> 'remarks'
    );
$$;

create function private.require_mcp_transaction_write(target_space_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
    caller_id uuid := (select auth.uid());
    oauth_client_id text := nullif(auth.jwt() ->> 'client_id', '');
    caller_role text;
    minute_result jsonb;
    daily_result jsonb;
begin
    if caller_id is null then
        raise exception 'Authentication required' using errcode = '28000';
    end if;
    if oauth_client_id is null
       or auth.jwt() ->> 'aud' <> 'https://xpensedv2.vercel.app/api/mcp' then
        raise exception 'MCP OAuth token required' using errcode = '42501';
    end if;

    caller_role := private.current_space_role(target_space_id);
    if caller_role is null or caller_role not in ('admin', 'collaborator') then
        raise exception 'Role cannot create transactions' using errcode = '42501';
    end if;

    minute_result := public.consume_api_rate_limit(
        encode(extensions.digest(
            'mcp-transaction-minute:' || caller_id::text || ':' || oauth_client_id,
            'sha256'
        ), 'hex'),
        30,
        60
    );
    if not (minute_result ->> 'allowed')::boolean then
        raise exception 'MCP transaction rate limit exceeded' using errcode = '53300';
    end if;

    daily_result := public.consume_api_rate_limit(
        encode(extensions.digest(
            'mcp-transaction-daily:' || caller_id::text || ':' || oauth_client_id,
            'sha256'
        ), 'hex'),
        500,
        86400
    );
    if not (daily_result ->> 'allowed')::boolean then
        raise exception 'MCP transaction daily limit exceeded' using errcode = '53300';
    end if;

    return caller_id;
end;
$$;

create function public.create_mcp_transaction(
    target_space_id uuid,
    transaction_amount numeric,
    transaction_date date,
    category_id uuid,
    merchant_name text,
    shop_id uuid default null,
    transaction_remarks text default null,
    transaction_currency text default 'IDR',
    idempotency_key text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    caller_id uuid := private.require_mcp_transaction_write(target_space_id);
    category_record public.space_records;
    shop_record public.space_records;
    existing_key private.mcp_transaction_idempotency;
    transaction_record public.space_records;
    transaction_id uuid := gen_random_uuid();
    transaction_payload jsonb;
    request_hash text;
begin
    if transaction_date is null then
        raise exception 'Transaction date is invalid' using errcode = '22023';
    end if;
    if transaction_amount is null or transaction_amount <= 0 or transaction_amount > 999999999999.99 then
        raise exception 'Transaction amount is invalid' using errcode = '22023';
    end if;
    if merchant_name is null or char_length(trim(merchant_name)) not between 1 and 120
       or trim(merchant_name) ~ E'[\\x01-\\x1F\\x7F]' then
        raise exception 'Merchant is invalid' using errcode = '22023';
    end if;
    if transaction_remarks is not null and (
        char_length(trim(transaction_remarks)) > 120 or trim(transaction_remarks) ~ E'[\\x01-\\x1F\\x7F]'
    ) then
        raise exception 'Remarks are invalid' using errcode = '22023';
    end if;
    if transaction_currency <> 'IDR' then
        raise exception 'Only IDR is supported' using errcode = '22023';
    end if;
    if idempotency_key is not null and idempotency_key !~ '^[A-Za-z0-9_-]{1,128}$' then
        raise exception 'Idempotency key is invalid' using errcode = '22023';
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
    request_hash := encode(extensions.digest(transaction_payload::text, 'sha256'), 'hex');

    if idempotency_key is not null then
        perform pg_advisory_xact_lock(hashtextextended(
            target_space_id::text || ':' || caller_id::text || ':mcp:' || idempotency_key,
            0
        ));
        select * into existing_key
        from private.mcp_transaction_idempotency
        where space_id = target_space_id and user_id = caller_id and idempotency_key = create_mcp_transaction.idempotency_key
        for update;
        if found then
            if existing_key.request_hash <> request_hash then
                raise exception 'Idempotency key was previously used with different fields' using errcode = '23505';
            end if;
            select * into transaction_record from public.space_records where id = existing_key.transaction_id;
            return jsonb_build_object(
                'item', private.mcp_transaction_item(transaction_record),
                'created', false,
                'idempotent_replay', true
            );
        end if;
    end if;

    select * into category_record from public.space_records
    where id = category_id and space_id = target_space_id and entity_type = 'category' and deleted_at is null;
    if not found or category_record.payload ->> 'type' <> 'Expense' then
        raise exception 'An active expense category is required' using errcode = '22023';
    end if;
    if shop_id is not null then
        select * into shop_record from public.space_records
        where id = shop_id and space_id = target_space_id and entity_type = 'shop' and deleted_at is null;
        if not found then
            raise exception 'Shop was not found' using errcode = '22023';
        end if;
    end if;

    insert into public.space_records (id, space_id, entity_type, payload, last_mutation_id, created_by, updated_by)
    values (transaction_id, target_space_id, 'transaction', transaction_payload, gen_random_uuid(), caller_id, caller_id)
    returning * into transaction_record;

    if idempotency_key is not null then
        insert into private.mcp_transaction_idempotency (space_id, user_id, idempotency_key, request_hash, transaction_id)
        values (target_space_id, caller_id, idempotency_key, request_hash, transaction_id);
    end if;
    return jsonb_build_object('item', private.mcp_transaction_item(transaction_record), 'created', true, 'idempotent_replay', false);
end;
$$;

create function public.update_mcp_transaction(
    target_space_id uuid,
    target_transaction_id uuid,
    target_version bigint,
    transaction_patch jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    caller_id uuid := private.require_mcp_transaction_write(target_space_id);
    transaction_record public.space_records;
    category_record public.space_records;
    shop_record public.space_records;
    next_payload jsonb;
    patch_key text;
    next_date date;
begin
    if target_version is null or target_version < 1 then raise exception 'Expected version is invalid' using errcode = '22023'; end if;
    if jsonb_typeof(transaction_patch) <> 'object' or transaction_patch = '{}'::jsonb then
        raise exception 'Transaction patch must contain at least one field' using errcode = '22023';
    end if;
    for patch_key in select jsonb_object_keys(transaction_patch) loop
        if patch_key not in ('amount', 'transaction_date', 'category_id', 'merchant', 'shop_id', 'remarks') then
            raise exception 'Transaction patch contains an unsupported field' using errcode = '22023';
        end if;
    end loop;

    select * into transaction_record from public.space_records
    where id = target_transaction_id and space_id = target_space_id and entity_type = 'transaction'
    for update;
    if not found then raise exception 'Transaction was not found' using errcode = '22023'; end if;
    if transaction_record.version <> target_version then raise exception 'Transaction changed since it was read' using errcode = '40001'; end if;
    if transaction_record.deleted_at is not null then raise exception 'Archived transaction cannot be updated' using errcode = '22023'; end if;
    next_payload := transaction_record.payload;

    if transaction_patch ? 'amount' then
        if jsonb_typeof(transaction_patch -> 'amount') <> 'number'
           or (transaction_patch ->> 'amount')::numeric <= 0
           or (transaction_patch ->> 'amount')::numeric > 999999999999.99 then
            raise exception 'Transaction amount is invalid' using errcode = '22023';
        end if;
        next_payload := jsonb_set(next_payload, '{amount}', transaction_patch -> 'amount');
    end if;
    if transaction_patch ? 'transaction_date' then
        if jsonb_typeof(transaction_patch -> 'transaction_date') <> 'string' then
            raise exception 'Transaction date is invalid' using errcode = '22023';
        end if;
        begin next_date := (transaction_patch ->> 'transaction_date')::date;
        exception when others then raise exception 'Transaction date is invalid' using errcode = '22023'; end;
        next_payload := jsonb_set(next_payload, '{date}', to_jsonb(next_date::text));
    end if;
    if transaction_patch ? 'category_id' then
        if jsonb_typeof(transaction_patch -> 'category_id') <> 'string' then raise exception 'Category is invalid' using errcode = '22023'; end if;
        begin
            select * into category_record from public.space_records
            where id = (transaction_patch ->> 'category_id')::uuid and space_id = target_space_id
              and entity_type = 'category' and deleted_at is null;
        exception when invalid_text_representation then
            raise exception 'Category is invalid' using errcode = '22023';
        end;
        if not found or category_record.payload ->> 'type' <> 'Expense' then
            raise exception 'An active expense category is required' using errcode = '22023';
        end if;
        next_payload := jsonb_set(next_payload, '{categoryId}', transaction_patch -> 'category_id');
    end if;
    if transaction_patch ? 'merchant' then
        if jsonb_typeof(transaction_patch -> 'merchant') <> 'string'
           or char_length(trim(transaction_patch ->> 'merchant')) not between 1 and 120
           or trim(transaction_patch ->> 'merchant') ~ E'[\\x01-\\x1F\\x7F]' then
            raise exception 'Merchant is invalid' using errcode = '22023';
        end if;
        next_payload := jsonb_set(next_payload, '{merchant}', to_jsonb(trim(transaction_patch ->> 'merchant')));
    end if;
    if transaction_patch ? 'shop_id' then
        if transaction_patch -> 'shop_id' = 'null'::jsonb then
            next_payload := next_payload - 'shopId';
        elsif jsonb_typeof(transaction_patch -> 'shop_id') = 'string' then
            begin
                select * into shop_record from public.space_records
                where id = (transaction_patch ->> 'shop_id')::uuid and space_id = target_space_id
                  and entity_type = 'shop' and deleted_at is null;
            exception when invalid_text_representation then
                raise exception 'Shop is invalid' using errcode = '22023';
            end;
            if not found then raise exception 'Shop was not found' using errcode = '22023'; end if;
            next_payload := jsonb_set(next_payload, '{shopId}', transaction_patch -> 'shop_id');
        else
            raise exception 'Shop is invalid' using errcode = '22023';
        end if;
    end if;
    if transaction_patch ? 'remarks' then
        if transaction_patch -> 'remarks' = 'null'::jsonb then
            next_payload := next_payload - 'remarks';
        elsif jsonb_typeof(transaction_patch -> 'remarks') = 'string'
           and char_length(trim(transaction_patch ->> 'remarks')) <= 120
           and trim(transaction_patch ->> 'remarks') !~ E'[\\x01-\\x1F\\x7F]' then
            next_payload := jsonb_set(next_payload, '{remarks}', to_jsonb(nullif(trim(transaction_patch ->> 'remarks'), '')));
            if next_payload -> 'remarks' = 'null'::jsonb then next_payload := next_payload - 'remarks'; end if;
        else
            raise exception 'Remarks are invalid' using errcode = '22023';
        end if;
    end if;

    update public.space_records
    set payload = next_payload, last_mutation_id = gen_random_uuid()
    where id = transaction_record.id
    returning * into transaction_record;
    return jsonb_build_object(
        'item', private.mcp_transaction_item(transaction_record),
        'created', false,
        'idempotent_replay', false
    );
end;
$$;

create function public.set_mcp_transaction_archived(
    target_space_id uuid,
    target_transaction_id uuid,
    target_version bigint,
    should_archive boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    caller_id uuid := private.require_mcp_transaction_write(target_space_id);
    transaction_record public.space_records;
begin
    if target_version is null or target_version < 1 then raise exception 'Expected version is invalid' using errcode = '22023'; end if;
    select * into transaction_record from public.space_records
    where id = target_transaction_id and space_id = target_space_id and entity_type = 'transaction'
    for update;
    if not found then raise exception 'Transaction was not found' using errcode = '22023'; end if;
    if transaction_record.version <> target_version then raise exception 'Transaction changed since it was read' using errcode = '40001'; end if;
    if (transaction_record.deleted_at is not null) = should_archive then
        return jsonb_build_object(
            'item', private.mcp_transaction_item(transaction_record),
            'created', false,
            'idempotent_replay', false
        );
    end if;
    update public.space_records
    -- Keep the payload during archive so restore remains lossless.
    set deleted_at = case when should_archive then now() else null end,
        last_mutation_id = gen_random_uuid()
    where id = transaction_record.id
    returning * into transaction_record;
    return jsonb_build_object(
        'item', private.mcp_transaction_item(transaction_record),
        'created', false,
        'idempotent_replay', false
    );
end;
$$;

revoke execute on function private.mcp_transaction_item(public.space_records) from public, anon, authenticated, service_role;
revoke execute on function private.require_mcp_transaction_write(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.create_mcp_transaction(uuid, numeric, date, uuid, text, uuid, text, text, text) from public, anon;
revoke execute on function public.update_mcp_transaction(uuid, uuid, bigint, jsonb) from public, anon;
revoke execute on function public.set_mcp_transaction_archived(uuid, uuid, bigint, boolean) from public, anon;
grant execute on function public.create_mcp_transaction(uuid, numeric, date, uuid, text, uuid, text, text, text) to authenticated;
grant execute on function public.update_mcp_transaction(uuid, uuid, bigint, jsonb) to authenticated;
grant execute on function public.set_mcp_transaction_archived(uuid, uuid, bigint, boolean) to authenticated;
