create table if not exists public.device_push_registrations (
  installation_id text primary key,
  user_id uuid null references auth.users(id) on delete set null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  expo_push_token text null,
  fcm_push_token text null,
  app_version text null,
  build_number text null,
  notification_permission text null,
  full_screen_intent_allowed boolean null,
  battery_optimization_status text null,
  opted_out_emergency boolean not null default false,
  linked_at timestamptz null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_push_registrations_has_token
    check (expo_push_token is not null or fcm_push_token is not null or notification_permission is not null)
);

create index if not exists idx_device_push_registrations_user_id
  on public.device_push_registrations(user_id)
  where user_id is not null;

create index if not exists idx_device_push_registrations_native_active
  on public.device_push_registrations(platform, last_seen_at)
  where fcm_push_token is not null and opted_out_emergency = false;

create index if not exists idx_device_push_registrations_expo_active
  on public.device_push_registrations(platform, last_seen_at)
  where expo_push_token is not null and opted_out_emergency = false;

create table if not exists public.broadcast_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid null references public.broadcasts(id) on delete set null,
  target text not null check (target in ('citizens', 'staff')),
  native_fcm_configured boolean not null default false,
  total_devices integer not null default 0,
  total_tokens integer not null default 0,
  native_attempted integer not null default 0,
  native_sent integer not null default 0,
  native_failed integer not null default 0,
  expo_attempted integer not null default 0,
  expo_sent integer not null default 0,
  expo_failed integer not null default 0,
  invalid_tokens_removed integer not null default 0,
  function_version text null,
  error_summary text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_broadcast_delivery_attempts_broadcast_created
  on public.broadcast_delivery_attempts(broadcast_id, created_at desc);

alter table public.device_push_registrations enable row level security;
alter table public.broadcast_delivery_attempts enable row level security;

drop policy if exists "Device owners can read their linked registration" on public.device_push_registrations;
create policy "Device owners can read their linked registration"
on public.device_push_registrations for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Command staff can read broadcast delivery attempts" on public.broadcast_delivery_attempts;
create policy "Command staff can read broadcast delivery attempts"
on public.broadcast_delivery_attempts for select to authenticated
using ((select private.is_command_staff()));

create or replace function public.register_device_push_token(
  p_installation_id text,
  p_platform text,
  p_expo_push_token text default null,
  p_fcm_push_token text default null,
  p_app_version text default null,
  p_build_number text default null,
  p_notification_permission text default null,
  p_full_screen_intent_allowed boolean default null,
  p_battery_optimization_status text default null,
  p_emergency_enabled boolean default true
)
returns public.device_push_registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_installation_id text := trim(coalesce(p_installation_id, ''));
  normalized_platform text := lower(trim(coalesce(p_platform, '')));
  saved public.device_push_registrations;
begin
  if normalized_installation_id !~ '^[A-Za-z0-9._:-]{16,128}$' then
    raise exception 'Invalid installation identifier';
  end if;

  if normalized_platform not in ('android', 'ios', 'web') then
    raise exception 'Invalid device platform';
  end if;

  if p_expo_push_token is not null and length(p_expo_push_token) > 2048 then
    raise exception 'Invalid Expo push token';
  end if;

  if p_fcm_push_token is not null and length(p_fcm_push_token) > 4096 then
    raise exception 'Invalid native push token';
  end if;

  insert into public.device_push_registrations (
    installation_id,
    user_id,
    platform,
    expo_push_token,
    fcm_push_token,
    app_version,
    build_number,
    notification_permission,
    full_screen_intent_allowed,
    battery_optimization_status,
    opted_out_emergency,
    linked_at,
    last_seen_at,
    updated_at
  )
  values (
    normalized_installation_id,
    current_user_id,
    normalized_platform,
    nullif(p_expo_push_token, ''),
    nullif(p_fcm_push_token, ''),
    nullif(p_app_version, ''),
    nullif(p_build_number, ''),
    nullif(p_notification_permission, ''),
    p_full_screen_intent_allowed,
    nullif(p_battery_optimization_status, ''),
    coalesce(not p_emergency_enabled, false),
    case when current_user_id is null then null else now() end,
    now(),
    now()
  )
  on conflict (installation_id) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      expo_push_token = coalesce(excluded.expo_push_token, public.device_push_registrations.expo_push_token),
      fcm_push_token = coalesce(excluded.fcm_push_token, public.device_push_registrations.fcm_push_token),
      app_version = excluded.app_version,
      build_number = excluded.build_number,
      notification_permission = excluded.notification_permission,
      full_screen_intent_allowed = excluded.full_screen_intent_allowed,
      battery_optimization_status = excluded.battery_optimization_status,
      opted_out_emergency = excluded.opted_out_emergency,
      linked_at = case when excluded.user_id is null then public.device_push_registrations.linked_at else now() end,
      last_seen_at = now(),
      updated_at = now()
  returning * into saved;

  return saved;
end;
$$;

create or replace function public.unlink_device_from_user(p_installation_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.device_push_registrations
  set user_id = null,
      linked_at = null,
      last_seen_at = now(),
      updated_at = now()
  where installation_id = trim(coalesce(p_installation_id, ''))
    and ((select auth.uid()) is null or user_id = (select auth.uid()));
end;
$$;

create or replace function public.get_broadcast_delivery_health()
returns table (
  native_android_devices integer,
  expo_fallback_devices integer,
  reachable_devices integer,
  notification_granted_devices integer,
  full_screen_allowed_devices integer,
  last_native_fcm_configured boolean,
  last_delivery_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_command_staff()) then
    raise exception 'Not authorized';
  end if;

  return query
  with active_devices as (
    select *
    from public.device_push_registrations device
    where device.opted_out_emergency = false
      and device.last_seen_at > now() - interval '90 days'
  ),
  last_attempt as (
    select attempt.native_fcm_configured, attempt.created_at
    from public.broadcast_delivery_attempts attempt
    where attempt.target = 'citizens'
    order by attempt.created_at desc
    limit 1
  )
  select
    count(*) filter (where active_devices.platform = 'android' and active_devices.fcm_push_token is not null)::integer,
    count(*) filter (where active_devices.expo_push_token is not null)::integer,
    count(*) filter (where active_devices.fcm_push_token is not null or active_devices.expo_push_token is not null)::integer,
    count(*) filter (where active_devices.notification_permission = 'granted')::integer,
    count(*) filter (where active_devices.full_screen_intent_allowed is true)::integer,
    coalesce((select last_attempt.native_fcm_configured from last_attempt), false),
    (select last_attempt.created_at from last_attempt);
end;
$$;

create or replace function public.get_broadcast_delivery_attempts(
  p_broadcast_id uuid default null,
  p_limit integer default 10
)
returns setof public.broadcast_delivery_attempts
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_command_staff()) then
    raise exception 'Not authorized';
  end if;

  return query
  select *
  from public.broadcast_delivery_attempts attempt
  where p_broadcast_id is null or attempt.broadcast_id = p_broadcast_id
  order by attempt.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
end;
$$;

grant execute on function public.register_device_push_token(
  text, text, text, text, text, text, text, boolean, text, boolean
) to anon, authenticated;

grant execute on function public.unlink_device_from_user(text) to anon, authenticated;
grant execute on function public.get_broadcast_delivery_health() to authenticated;
grant execute on function public.get_broadcast_delivery_attempts(uuid, integer) to authenticated;
