create table if not exists public.wakaranjan_learning_profiles (
  name_key text primary key,
  display_name text not null,
  learning_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint wakaranjan_learning_profiles_name_key_length
    check (char_length(name_key) between 1 and 80),
  constraint wakaranjan_learning_profiles_display_name_length
    check (char_length(display_name) between 1 and 40),
  constraint wakaranjan_learning_profiles_state_object
    check (jsonb_typeof(learning_state) = 'object')
);

comment on table public.wakaranjan_learning_profiles is
  'Wakaranjan learning names and progress. Deliberately separate from game score tables; name_key is the shared identity.';
comment on column public.wakaranjan_learning_profiles.learning_state is
  'Lesson and question learning records only. Game scores are not stored here.';

alter table public.wakaranjan_learning_profiles enable row level security;

grant select, insert, update, delete
  on table public.wakaranjan_learning_profiles
  to anon, authenticated;

drop policy if exists wakaranjan_learning_profiles_select_by_name on public.wakaranjan_learning_profiles;
drop policy if exists wakaranjan_learning_profiles_insert_by_name on public.wakaranjan_learning_profiles;
drop policy if exists wakaranjan_learning_profiles_update_by_name on public.wakaranjan_learning_profiles;
drop policy if exists wakaranjan_learning_profiles_delete_by_name on public.wakaranjan_learning_profiles;

-- The product intentionally uses the entered name as its shared key. RLS is
-- enabled, but access is deliberately public-by-name so another device can
-- open the same learner without a login or transfer code.
create policy wakaranjan_learning_profiles_select_by_name
  on public.wakaranjan_learning_profiles
  for select
  to anon, authenticated
  using (true);

create policy wakaranjan_learning_profiles_insert_by_name
  on public.wakaranjan_learning_profiles
  for insert
  to anon, authenticated
  with check (true);

create policy wakaranjan_learning_profiles_update_by_name
  on public.wakaranjan_learning_profiles
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy wakaranjan_learning_profiles_delete_by_name
  on public.wakaranjan_learning_profiles
  for delete
  to anon, authenticated
  using (true);
