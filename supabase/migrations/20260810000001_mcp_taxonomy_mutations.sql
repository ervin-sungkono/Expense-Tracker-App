-- Dedicated OAuth-gated taxonomy RPCs. Generic sync writes remain unavailable to MCP tokens.

create function private.require_mcp_taxonomy_write(target_space_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
    caller_id uuid := (select auth.uid());
    oauth_client_id text := nullif(auth.jwt() ->> 'client_id', '');
    rate_result jsonb;
    daily_result jsonb;
begin
    if caller_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
    if oauth_client_id is null or auth.jwt() ->> 'aud' <> 'https://xpensedv2.vercel.app/api/mcp' then
        raise exception 'MCP OAuth token required' using errcode = '42501';
    end if;
    if private.current_space_role(target_space_id) <> 'admin' then
        raise exception 'Role cannot manage categories or shops' using errcode = '42501';
    end if;
    rate_result := public.consume_api_rate_limit(
        encode(extensions.digest('mcp-taxonomy-minute:' || caller_id::text || ':' || oauth_client_id, 'sha256'), 'hex'), 30, 60
    );
    if not coalesce((rate_result ->> 'allowed')::boolean, false) then
        raise exception 'MCP taxonomy rate limit exceeded' using errcode = '53300';
    end if;
    daily_result := public.consume_api_rate_limit(
        encode(extensions.digest('mcp-taxonomy-daily:' || caller_id::text || ':' || oauth_client_id, 'sha256'), 'hex'), 500, 86400
    );
    if not coalesce((daily_result ->> 'allowed')::boolean, false) then
        raise exception 'MCP taxonomy daily limit exceeded' using errcode = '53300';
    end if;
    return caller_id;
end;
$$;

create function private.require_mcp_taxonomy_read(target_space_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
    if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '28000'; end if;
    if nullif(auth.jwt() ->> 'client_id', '') is null or auth.jwt() ->> 'aud' <> 'https://xpensedv2.vercel.app/api/mcp' then
        raise exception 'MCP OAuth token required' using errcode = '42501';
    end if;
    if private.current_space_role(target_space_id) is null then raise exception 'Space access denied' using errcode = '42501'; end if;
end;
$$;

create function private.mcp_taxonomy_item(record public.space_records)
returns jsonb language sql stable set search_path = '' as $$
    select jsonb_build_object(
        'id', record.id, 'version', record.version,
        'status', case when record.deleted_at is null then 'active' else 'archived' end,
        'name', record.payload ->> 'name', 'icon', record.payload ->> 'icon',
        'parent_id', record.payload ->> 'parentId', 'location', record.payload ->> 'location'
    );
$$;

create function private.require_mcp_category_parent(target_space_id uuid, target_category_id uuid, parent_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare parent_record public.space_records; cursor_id uuid := parent_id; depth integer := 0;
begin
    if parent_id is null then return; end if;
    if parent_id = target_category_id then raise exception 'Category cannot be its own parent' using errcode = '22023'; end if;
    select * into parent_record from public.space_records
    where id = parent_id and space_id = target_space_id and entity_type = 'category' and deleted_at is null;
    if not found then raise exception 'Parent category must be active and in the same space' using errcode = '22023'; end if;
    while cursor_id is not null loop
        if cursor_id = target_category_id then raise exception 'Category hierarchy cannot contain a cycle' using errcode = '22023'; end if;
        depth := depth + 1;
        if depth > 10 then raise exception 'Category hierarchy is too deep' using errcode = '22023'; end if;
        select nullif(payload ->> 'parentId', '')::uuid into cursor_id from public.space_records
        where id = cursor_id and space_id = target_space_id and entity_type = 'category';
    end loop;
end;
$$;

create function public.create_mcp_category(target_space_id uuid, category_name text, parent_id uuid default null, category_icon text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := private.require_mcp_taxonomy_write(target_space_id); record public.space_records; category_id uuid := gen_random_uuid();
begin
    if category_name is null or char_length(trim(category_name)) not between 3 and 30 or trim(category_name) ~ E'[\\x01-\\x1F\\x7F]' then raise exception 'Category name is invalid' using errcode = '22023'; end if;
    if category_icon is not null and (char_length(trim(category_icon)) > 120 or trim(category_icon) ~ E'[\\x01-\\x1F\\x7F]') then raise exception 'Category icon is invalid' using errcode = '22023'; end if;
    perform private.require_mcp_category_parent(target_space_id, category_id, parent_id);
    if exists (select 1 from public.space_records where space_id = target_space_id and entity_type = 'category' and deleted_at is null and lower(payload ->> 'name') = lower(trim(category_name)) and coalesce(payload ->> 'parentId', '') = coalesce(parent_id::text, '')) then
        raise exception 'An active category with that name already exists under this parent' using errcode = '23505';
    end if;
    insert into public.space_records (id, space_id, entity_type, payload, last_mutation_id, created_by, updated_by)
    values (category_id, target_space_id, 'category', jsonb_strip_nulls(jsonb_build_object('name', trim(category_name), 'type', 'Expense', 'parentId', parent_id, 'icon', nullif(trim(category_icon), ''))), gen_random_uuid(), caller_id, caller_id)
    returning * into record;
    return jsonb_build_object('item', private.mcp_taxonomy_item(record));
end;
$$;

create function public.update_mcp_category(target_space_id uuid, target_category_id uuid, target_version bigint, category_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := private.require_mcp_taxonomy_write(target_space_id); record public.space_records; next_payload jsonb; next_parent uuid; key text;
begin
    if target_version is null or target_version < 1 or jsonb_typeof(category_patch) <> 'object' or category_patch = '{}'::jsonb then raise exception 'Expected version and a category patch are required' using errcode = '22023'; end if;
    for key in select jsonb_object_keys(category_patch) loop if key not in ('name', 'parent_id', 'icon') then raise exception 'Category patch contains an unsupported field' using errcode = '22023'; end if; end loop;
    select * into record from public.space_records where id = target_category_id and space_id = target_space_id and entity_type = 'category' for update;
    if not found then raise exception 'Category was not found' using errcode = '22023'; end if;
    if record.version <> target_version then raise exception 'Category changed since it was read' using errcode = '40001'; end if;
    if record.deleted_at is not null then raise exception 'Archived category cannot be updated' using errcode = '22023'; end if;
    next_payload := record.payload;
    if category_patch ? 'name' then
        if jsonb_typeof(category_patch -> 'name') <> 'string' or char_length(trim(category_patch ->> 'name')) not between 3 and 30 or trim(category_patch ->> 'name') ~ E'[\\x01-\\x1F\\x7F]' then raise exception 'Category name is invalid' using errcode = '22023'; end if;
        next_payload := jsonb_set(next_payload, '{name}', to_jsonb(trim(category_patch ->> 'name')));
    end if;
    if category_patch ? 'icon' then
        if category_patch -> 'icon' = 'null'::jsonb then next_payload := next_payload - 'icon';
        elsif jsonb_typeof(category_patch -> 'icon') <> 'string' or char_length(trim(category_patch ->> 'icon')) > 120 or trim(category_patch ->> 'icon') ~ E'[\\x01-\\x1F\\x7F]' then raise exception 'Category icon is invalid' using errcode = '22023';
        else next_payload := jsonb_set(next_payload, '{icon}', to_jsonb(nullif(trim(category_patch ->> 'icon'), ''))); if next_payload -> 'icon' = 'null'::jsonb then next_payload := next_payload - 'icon'; end if; end if;
    end if;
    if category_patch ? 'parent_id' then
        if category_patch -> 'parent_id' = 'null'::jsonb then next_parent := null;
        elsif jsonb_typeof(category_patch -> 'parent_id') = 'string' then begin next_parent := (category_patch ->> 'parent_id')::uuid; exception when invalid_text_representation then raise exception 'Parent category is invalid' using errcode = '22023'; end;
        else raise exception 'Parent category is invalid' using errcode = '22023'; end if;
        perform private.require_mcp_category_parent(target_space_id, target_category_id, next_parent);
        if next_parent is null then next_payload := next_payload - 'parentId'; else next_payload := jsonb_set(next_payload, '{parentId}', to_jsonb(next_parent::text)); end if;
    end if;
    if exists (select 1 from public.space_records where space_id = target_space_id and entity_type = 'category' and deleted_at is null and id <> target_category_id and lower(payload ->> 'name') = lower(next_payload ->> 'name') and coalesce(payload ->> 'parentId', '') = coalesce(next_payload ->> 'parentId', '')) then raise exception 'An active category with that name already exists under this parent' using errcode = '23505'; end if;
    update public.space_records set payload = next_payload, last_mutation_id = gen_random_uuid(), updated_by = caller_id where id = record.id returning * into record;
    return jsonb_build_object('item', private.mcp_taxonomy_item(record));
end;
$$;

create function public.set_mcp_category_archived(target_space_id uuid, target_category_id uuid, target_version bigint, should_archive boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := private.require_mcp_taxonomy_write(target_space_id); record public.space_records;
begin
    if target_version is null or target_version < 1 then raise exception 'Expected version is invalid' using errcode = '22023'; end if;
    select * into record from public.space_records where id = target_category_id and space_id = target_space_id and entity_type = 'category' for update;
    if not found then raise exception 'Category was not found' using errcode = '22023'; end if;
    if record.version <> target_version then raise exception 'Category changed since it was read' using errcode = '40001'; end if;
    if (record.deleted_at is not null) = should_archive then return jsonb_build_object('item', private.mcp_taxonomy_item(record)); end if;
    if should_archive and exists (select 1 from public.space_records where space_id = target_space_id and entity_type = 'category' and deleted_at is null and payload ->> 'parentId' = target_category_id::text) then raise exception 'Category has active children' using errcode = '22023'; end if;
    if not should_archive and nullif(record.payload ->> 'parentId', '') is not null and not exists (select 1 from public.space_records where id = (record.payload ->> 'parentId')::uuid and space_id = target_space_id and entity_type = 'category' and deleted_at is null) then raise exception 'Category parent must be restored first' using errcode = '22023'; end if;
    update public.space_records set deleted_at = case when should_archive then now() else null end, last_mutation_id = gen_random_uuid(), updated_by = caller_id where id = record.id returning * into record;
    return jsonb_build_object('item', private.mcp_taxonomy_item(record));
end;
$$;

create function public.create_mcp_shop(target_space_id uuid, shop_name text, shop_location text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := private.require_mcp_taxonomy_write(target_space_id); record public.space_records; shop_id uuid := gen_random_uuid();
begin
    if shop_name is null or char_length(trim(shop_name)) not between 3 and 30 or trim(shop_name) ~ E'[\\x01-\\x1F\\x7F]' then raise exception 'Shop name is invalid' using errcode = '22023'; end if;
    if shop_location is null or char_length(trim(shop_location)) < 3 or char_length(trim(shop_location)) > 120 or trim(shop_location) ~ E'[\\x01-\\x1F\\x7F]' then raise exception 'Shop location is invalid' using errcode = '22023'; end if;
    if exists (select 1 from public.space_records where space_id = target_space_id and entity_type = 'shop' and deleted_at is null and lower(payload ->> 'name') = lower(trim(shop_name))) then raise exception 'An active shop with that name already exists' using errcode = '23505'; end if;
    insert into public.space_records (id, space_id, entity_type, payload, last_mutation_id, created_by, updated_by) values (shop_id, target_space_id, 'shop', jsonb_strip_nulls(jsonb_build_object('name', trim(shop_name), 'location', nullif(trim(shop_location), ''))), gen_random_uuid(), caller_id, caller_id) returning * into record;
    return jsonb_build_object('item', private.mcp_taxonomy_item(record));
end;
$$;

create function public.update_mcp_shop(target_space_id uuid, target_shop_id uuid, target_version bigint, shop_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := private.require_mcp_taxonomy_write(target_space_id); record public.space_records; next_payload jsonb; key text;
begin
    if target_version is null or target_version < 1 or jsonb_typeof(shop_patch) <> 'object' or shop_patch = '{}'::jsonb then raise exception 'Expected version and a shop patch are required' using errcode = '22023'; end if;
    for key in select jsonb_object_keys(shop_patch) loop if key not in ('name', 'location') then raise exception 'Shop patch contains an unsupported field' using errcode = '22023'; end if; end loop;
    select * into record from public.space_records where id = target_shop_id and space_id = target_space_id and entity_type = 'shop' for update;
    if not found then raise exception 'Shop was not found' using errcode = '22023'; end if;
    if record.version <> target_version then raise exception 'Shop changed since it was read' using errcode = '40001'; end if;
    if record.deleted_at is not null then raise exception 'Archived shop cannot be updated' using errcode = '22023'; end if;
    next_payload := record.payload;
    if shop_patch ? 'name' then if jsonb_typeof(shop_patch -> 'name') <> 'string' or char_length(trim(shop_patch ->> 'name')) not between 3 and 30 or trim(shop_patch ->> 'name') ~ E'[\\x01-\\x1F\\x7F]' then raise exception 'Shop name is invalid' using errcode = '22023'; end if; next_payload := jsonb_set(next_payload, '{name}', to_jsonb(trim(shop_patch ->> 'name'))); end if;
    if shop_patch ? 'location' then if shop_patch -> 'location' = 'null'::jsonb then raise exception 'Shop location is invalid' using errcode = '22023'; elsif jsonb_typeof(shop_patch -> 'location') <> 'string' or char_length(trim(shop_patch ->> 'location')) < 3 or char_length(trim(shop_patch ->> 'location')) > 120 or trim(shop_patch ->> 'location') ~ E'[\\x01-\\x1F\\x7F]' then raise exception 'Shop location is invalid' using errcode = '22023'; else next_payload := jsonb_set(next_payload, '{location}', to_jsonb(trim(shop_patch ->> 'location'))); end if; end if;
    if exists (select 1 from public.space_records where space_id = target_space_id and entity_type = 'shop' and deleted_at is null and id <> target_shop_id and lower(payload ->> 'name') = lower(next_payload ->> 'name')) then raise exception 'An active shop with that name already exists' using errcode = '23505'; end if;
    update public.space_records set payload = next_payload, last_mutation_id = gen_random_uuid(), updated_by = caller_id where id = record.id returning * into record;
    return jsonb_build_object('item', private.mcp_taxonomy_item(record));
end;
$$;

create function public.set_mcp_shop_archived(target_space_id uuid, target_shop_id uuid, target_version bigint, should_archive boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := private.require_mcp_taxonomy_write(target_space_id); record public.space_records;
begin
    if target_version is null or target_version < 1 then raise exception 'Expected version is invalid' using errcode = '22023'; end if;
    select * into record from public.space_records where id = target_shop_id and space_id = target_space_id and entity_type = 'shop' for update;
    if not found then raise exception 'Shop was not found' using errcode = '22023'; end if;
    if record.version <> target_version then raise exception 'Shop changed since it was read' using errcode = '40001'; end if;
    if (record.deleted_at is not null) = should_archive then return jsonb_build_object('item', private.mcp_taxonomy_item(record)); end if;
    update public.space_records set deleted_at = case when should_archive then now() else null end, last_mutation_id = gen_random_uuid(), updated_by = caller_id where id = record.id returning * into record;
    return jsonb_build_object('item', private.mcp_taxonomy_item(record));
end;
$$;

create function public.match_mcp_shop(target_space_id uuid, merchant_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
    perform private.require_mcp_taxonomy_read(target_space_id);
    if merchant_name is null or char_length(trim(merchant_name)) not between 1 and 120 or trim(merchant_name) ~ E'[\\x01-\\x1F\\x7F]' then
        raise exception 'Merchant is invalid' using errcode = '22023';
    end if;
    return (
    with normalized as (
      select regexp_replace(lower(trim(merchant_name)), '[^a-z0-9]+', '', 'g') as value
    ), candidate as (
      select r.id, r.payload ->> 'name' as name
      from public.space_records r, normalized n
      where r.space_id = target_space_id and r.entity_type = 'shop' and r.deleted_at is null
        and regexp_replace(lower(r.payload ->> 'name'), '[^a-z0-9]+', '', 'g') = n.value
      order by r.id limit 1
    )
    select case when exists (select 1 from candidate) then jsonb_build_object('matched', true, 'shop', (select jsonb_build_object('id', id, 'name', name) from candidate), 'confidence', 1.0)
      else jsonb_build_object('matched', false, 'shop', null, 'confidence', null) end
    );
end;
$$;

revoke execute on function private.require_mcp_taxonomy_write(uuid), private.require_mcp_taxonomy_read(uuid), private.mcp_taxonomy_item(public.space_records), private.require_mcp_category_parent(uuid, uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.create_mcp_category(uuid, text, uuid, text), public.update_mcp_category(uuid, uuid, bigint, jsonb), public.set_mcp_category_archived(uuid, uuid, bigint, boolean), public.create_mcp_shop(uuid, text, text), public.update_mcp_shop(uuid, uuid, bigint, jsonb), public.set_mcp_shop_archived(uuid, uuid, bigint, boolean), public.match_mcp_shop(uuid, text) from public, anon;
grant execute on function public.create_mcp_category(uuid, text, uuid, text), public.update_mcp_category(uuid, uuid, bigint, jsonb), public.set_mcp_category_archived(uuid, uuid, bigint, boolean), public.create_mcp_shop(uuid, text, text), public.update_mcp_shop(uuid, uuid, bigint, jsonb), public.set_mcp_shop_archived(uuid, uuid, bigint, boolean), public.match_mcp_shop(uuid, text) to authenticated;
