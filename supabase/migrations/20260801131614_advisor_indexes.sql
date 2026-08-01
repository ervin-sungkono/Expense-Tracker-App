create index spaces_owner_id_idx on public.spaces (owner_id) where deleting_at is null;
create index space_member_keys_user_key_idx on public.space_member_keys (user_id, user_key_version);
create index space_invitations_created_by_idx on public.space_invitations (created_by);
create index space_invitations_accepted_by_idx on public.space_invitations (accepted_by) where accepted_by is not null;
