-- Keep Watch-only broadcast delivery readers out of the exposed public schema
-- while preserving the existing public RPC names used by Watch Command.

create or replace function private.get_broadcast_delivery_health()
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
    (select last_attempt.created_at from last_attempt)
  from active_devices;
end;
$$;

create or replace function private.get_broadcast_delivery_attempts(
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
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.get_broadcast_delivery_health();
$$;

create or replace function public.get_broadcast_delivery_attempts(
  p_broadcast_id uuid default null,
  p_limit integer default 10
)
returns setof public.broadcast_delivery_attempts
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.get_broadcast_delivery_attempts(p_broadcast_id, p_limit);
$$;

revoke all on function private.get_broadcast_delivery_health() from public, anon, authenticated;
revoke all on function private.get_broadcast_delivery_attempts(uuid, integer) from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.get_broadcast_delivery_health() to authenticated;
grant execute on function private.get_broadcast_delivery_attempts(uuid, integer) to authenticated;

revoke all on function public.get_broadcast_delivery_health() from public, anon;
grant execute on function public.get_broadcast_delivery_health() to authenticated;

revoke all on function public.get_broadcast_delivery_attempts(uuid, integer) from public, anon;
grant execute on function public.get_broadcast_delivery_attempts(uuid, integer) to authenticated;

comment on function private.get_broadcast_delivery_health() is
  'Privileged staff-gated implementation for Watch Command broadcast delivery readiness.';

comment on function private.get_broadcast_delivery_attempts(uuid, integer) is
  'Privileged staff-gated implementation for Watch Command broadcast delivery attempt audit rows.';

comment on function public.get_broadcast_delivery_health() is
  'Security-invoker API wrapper for Watch Command broadcast delivery readiness.';

comment on function public.get_broadcast_delivery_attempts(uuid, integer) is
  'Security-invoker API wrapper for Watch Command broadcast delivery attempt audit rows.';
