-- Broadcast delivery health is a Watch Command staff/admin surface.
-- Device registration RPCs remain callable by anonymous devices so signed-out
-- installed phones can continue receiving emergency broadcasts.
revoke all on function public.get_broadcast_delivery_health() from public, anon;
grant execute on function public.get_broadcast_delivery_health() to authenticated;

revoke all on function public.get_broadcast_delivery_attempts(uuid, integer) from public, anon;
grant execute on function public.get_broadcast_delivery_attempts(uuid, integer) to authenticated;

comment on function public.get_broadcast_delivery_health() is
  'Returns aggregate broadcast readiness only after private.is_command_staff() authorizes the caller.';

comment on function public.get_broadcast_delivery_attempts(uuid, integer) is
  'Returns broadcast delivery audit rows only after private.is_command_staff() authorizes the caller.';
