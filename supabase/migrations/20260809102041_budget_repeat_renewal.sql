-- Renew recurring budgets in the database so that no device has to be open.
-- Budget periods are preserved by their selected calendar interval.

create or replace function private.version_space_record()
returns trigger language plpgsql set search_path = '' as $$
begin
    if tg_op = 'UPDATE' then
        new.version = old.version + 1;
        new.created_by = old.created_by;
        new.created_at = old.created_at;
    end if;
    -- Scheduled maintenance has no authenticated Supabase user. Keep the prior
    -- editor in that case while retaining the normal audit behaviour for users.
    new.updated_by = coalesce((select auth.uid()), old.updated_by, new.updated_by);
    new.updated_at = now();
    new.server_revision = nextval('public.space_revision_seq');
    return new;
end;
$$;

create or replace function private.renew_repeating_budgets()
returns integer
language plpgsql
security definer
set search_path = '' as $$
declare
    budget_record public.space_records;
    period_name text;
    period_step interval;
    next_start timestamptz;
    next_end timestamptz;
    renewed_count integer := 0;
begin
    for budget_record in
        select *
        from public.space_records
        where entity_type = 'budget'
          and deleted_at is null
          and payload ->> 'repeat' = 'true'
          and payload ->> 'repeatInterval' in ('weekly', 'monthly', 'quarter', 'annual')
          and (payload ->> 'end_date')::timestamptz < now()
        for update skip locked
    loop
        period_name := budget_record.payload ->> 'repeatInterval';
        period_step := case period_name
            when 'weekly' then interval '1 week'
            when 'monthly' then interval '1 month'
            when 'quarter' then interval '3 months'
            when 'annual' then interval '1 year'
        end;
        next_start := (budget_record.payload ->> 'start_date')::timestamptz;
        next_end := (budget_record.payload ->> 'end_date')::timestamptz;

        -- A device may have been offline for several periods. Move directly to
        -- the current period instead of creating a backlog of budgets.
        while next_end < now() loop
            next_start := next_start + period_step;
            next_end := next_end + period_step;
        end loop;

        update public.space_records
        set payload = jsonb_set(
            jsonb_set(payload, '{start_date}', to_jsonb(next_start), true),
            '{end_date}', to_jsonb(next_end), true
        )
        where id = budget_record.id;
        renewed_count := renewed_count + 1;
    end loop;

    return renewed_count;
end;
$$;

revoke all on function private.renew_repeating_budgets() from public, anon, authenticated, service_role;

-- Supabase Cron runs this hourly. It is deliberately a single database job for
-- all spaces; a browser does not need to be open for a budget to renew.
create extension if not exists pg_cron;
select cron.schedule(
    'xpensed-renew-repeating-budgets',
    '5 * * * *',
    'select private.renew_repeating_budgets();'
);
