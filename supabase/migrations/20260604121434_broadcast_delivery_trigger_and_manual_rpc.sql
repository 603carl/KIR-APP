create extension if not exists pg_net with schema extensions;

create or replace function public.queue_broadcast_delivery_request(
  p_table text,
  p_record_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_table text := lower(trim(coalesce(p_table, '')));
  function_url text := coalesce(
    nullif(current_setting('app.settings.broadcast_delivery_function_url', true), ''),
    'https://kbudyhgugehbdgoaofiv.supabase.co/functions/v1/broadcast-delivery'
  );
  internal_secret text := coalesce(
    nullif(current_setting('app.settings.internal_broadcast_secret', true), ''),
    'kir_internal_pulse_2026'
  );
  request_id bigint;
begin
  if normalized_table not in ('broadcasts', 'sos_alerts') then
    raise exception 'Unsupported delivery table';
  end if;

  if p_record_id is null then
    raise exception 'Broadcast delivery record id is required';
  end if;

  select net.http_post(
    url := function_url,
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', normalized_table,
      'record', jsonb_build_object('id', p_record_id)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', internal_secret
    ),
    timeout_milliseconds := 10000
  )
  into request_id;

  return request_id;
end;
$$;

create or replace function public.trigger_broadcast_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.queue_broadcast_delivery_request(tg_table_name, new.id);
  return new;
end;
$$;

create or replace function public.deliver_broadcast_now(p_broadcast_id uuid)
returns table (
  request_id bigint,
  broadcast_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_command_staff()) then
    raise exception 'Not authorized';
  end if;

  if not exists (select 1 from public.broadcasts where id = p_broadcast_id) then
    raise exception 'Broadcast not found';
  end if;

  request_id := public.queue_broadcast_delivery_request('broadcasts', p_broadcast_id);
  broadcast_id := p_broadcast_id;
  return next;
end;
$$;

drop trigger if exists broadcasts_trigger_delivery on public.broadcasts;
create trigger broadcasts_trigger_delivery
after insert on public.broadcasts
for each row
execute function public.trigger_broadcast_delivery();

drop trigger if exists sos_alerts_trigger_delivery on public.sos_alerts;
create trigger sos_alerts_trigger_delivery
after insert on public.sos_alerts
for each row
execute function public.trigger_broadcast_delivery();

revoke execute on function public.queue_broadcast_delivery_request(text, uuid) from public, anon, authenticated;
revoke execute on function public.trigger_broadcast_delivery() from public, anon, authenticated;
grant execute on function public.deliver_broadcast_now(uuid) to authenticated;
