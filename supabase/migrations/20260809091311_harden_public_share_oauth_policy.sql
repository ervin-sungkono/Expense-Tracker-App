drop policy if exists public_shares_manage on public.space_public_shares;

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
