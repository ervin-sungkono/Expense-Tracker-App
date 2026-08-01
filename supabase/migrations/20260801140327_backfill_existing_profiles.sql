insert into public.profiles (id, display_name, avatar_url)
select
    id,
    coalesce(
        nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
        split_part(coalesce(email, 'Xpensed user'), '@', 1)
    ),
    nullif(raw_user_meta_data ->> 'avatar_url', '')
from auth.users
on conflict (id) do nothing;
