create schema if not exists internal_api;

revoke all on schema internal_api from public;
grant usage on schema internal_api to anon, authenticated;

create or replace function internal_api.register_device_push_token(
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

create or replace function internal_api.unlink_device_from_user(p_installation_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_installation_id text := trim(coalesce(p_installation_id, ''));
begin
  if normalized_installation_id !~ '^[A-Za-z0-9._:-]{16,128}$' then
    raise exception 'Invalid installation identifier';
  end if;

  update public.device_push_registrations
  set user_id = null,
      linked_at = null,
      last_seen_at = now(),
      updated_at = now()
  where installation_id = normalized_installation_id
    and ((select auth.uid()) is null or user_id = (select auth.uid()));
end;
$$;

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
language sql
security invoker
set search_path = ''
as $$
  select *
  from internal_api.register_device_push_token(
    p_installation_id,
    p_platform,
    p_expo_push_token,
    p_fcm_push_token,
    p_app_version,
    p_build_number,
    p_notification_permission,
    p_full_screen_intent_allowed,
    p_battery_optimization_status,
    p_emergency_enabled
  );
$$;

create or replace function public.unlink_device_from_user(p_installation_id text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select internal_api.unlink_device_from_user(p_installation_id);
$$;

revoke all on function internal_api.register_device_push_token(
  text, text, text, text, text, text, text, boolean, text, boolean
) from public;
grant execute on function internal_api.register_device_push_token(
  text, text, text, text, text, text, text, boolean, text, boolean
) to anon, authenticated;

revoke all on function internal_api.unlink_device_from_user(text) from public;
grant execute on function internal_api.unlink_device_from_user(text) to anon, authenticated;

revoke all on function public.register_device_push_token(
  text, text, text, text, text, text, text, boolean, text, boolean
) from public;
grant execute on function public.register_device_push_token(
  text, text, text, text, text, text, text, boolean, text, boolean
) to anon, authenticated;

revoke all on function public.unlink_device_from_user(text) from public;
grant execute on function public.unlink_device_from_user(text) to anon, authenticated;

comment on schema internal_api is
  'Non-exposed implementation schema for API wrappers that must preserve public RPC compatibility.';

comment on function internal_api.register_device_push_token(
  text, text, text, text, text, text, text, boolean, text, boolean
) is
  'Privileged implementation for signed-out and signed-in emergency broadcast device token registration.';

comment on function internal_api.unlink_device_from_user(text) is
  'Privileged implementation for unlinking a device from a citizen user while preserving emergency broadcast reachability.';

comment on function public.register_device_push_token(
  text, text, text, text, text, text, text, boolean, text, boolean
) is
  'Security-invoker API wrapper for emergency broadcast device token registration.';

comment on function public.unlink_device_from_user(text) is
  'Security-invoker API wrapper for emergency broadcast device unlinking.';
