-- MCP-created categories are ordinary user categories and use a bundled icon.

create or replace function public.create_mcp_category(target_space_id uuid, category_name text, parent_id uuid default null, category_icon text default null)
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
    values (category_id, target_space_id, 'category', jsonb_strip_nulls(jsonb_build_object('name', trim(category_name), 'type', 'Expense', 'parentId', parent_id, 'icon', coalesce(nullif(trim(category_icon), ''), 'sky--weather_star.svg'), 'mutable', true)), gen_random_uuid(), caller_id, caller_id)
    returning * into record;
    return jsonb_build_object('item', private.mcp_taxonomy_item(record));
end;
$$;
