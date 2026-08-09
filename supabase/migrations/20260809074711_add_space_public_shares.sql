create table public.space_public_shares (
    space_id uuid primary key references public.spaces(id) on delete cascade,
    token_hash bytea not null unique,
    created_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    revoked_at timestamptz
);

create index space_public_shares_active_idx
    on public.space_public_shares (space_id)
    where revoked_at is null;

create trigger space_public_shares_touch
    before update on public.space_public_shares
    for each row execute function private.touch_updated_at();

alter table public.space_public_shares enable row level security;

create policy public_shares_manage on public.space_public_shares
    for all to authenticated
    using (
        auth.jwt() ->> 'client_id' is null
        and (
            private.is_space_owner(space_id)
            or private.current_space_role(space_id) = 'admin'
        )
    )
    with check (
        auth.jwt() ->> 'client_id' is null
        and (
            private.is_space_owner(space_id)
            or private.current_space_role(space_id) = 'admin'
        )
    );

revoke all on public.space_public_shares from anon;
grant select, insert, update on public.space_public_shares to authenticated;
