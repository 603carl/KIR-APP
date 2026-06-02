alter table public.profiles
  add column if not exists fcm_push_token text;

create index if not exists idx_profiles_fcm_push_token_present
  on public.profiles (id)
  where fcm_push_token is not null;
