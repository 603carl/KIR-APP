create or replace function private.normalize_feed_county(value text)
returns text
language sql
immutable
set search_path to ''
as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(btrim(coalesce(value, ''))), '\s+county$', '', 'i'),
      '\s+city$',
      '',
      'i'
    ),
    ''
  );
$$;

create index if not exists incidents_feed_created_idx
on public.incidents (created_at desc);

create index if not exists incidents_feed_category_created_idx
on public.incidents (category, created_at desc);

create index if not exists incidents_feed_county_created_idx
on public.incidents (private.normalize_feed_county(county), created_at desc);

create index if not exists incidents_feed_geo_gist_idx
on public.incidents
using gist ((st_setsrid(st_makepoint(lng, lat), 4326)::geography))
where lat is not null
  and lng is not null
  and lat between -90 and 90
  and lng between -180 and 180;

create or replace function private.get_smart_community_feed(
  target_user_id uuid,
  user_lat double precision default null::double precision,
  user_lng double precision default null::double precision,
  search_query text default null::text,
  selected_cat text default null::text
)
returns setof public.incidents
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  user_affinity jsonb := '{}'::jsonb;
  user_county text;
  normalized_user_county text;
  profile_location geography;
  effective_location geography;
  feed_radius_meters constant double precision := 20000;
  feed_window interval := interval '7 days';
begin
  select
    coalesce(category_affinity, '{}'::jsonb),
    county,
    location_focal_point
  into user_affinity, user_county, profile_location
  from public.profiles
  where id = target_user_id;

  normalized_user_county := private.normalize_feed_county(user_county);

  if user_lat is not null
     and user_lng is not null
     and user_lat between -90 and 90
     and user_lng between -180 and 180 then
    effective_location := st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
  else
    effective_location := profile_location;
  end if;

  return query
  with candidates as (
    select
      i.*,
      case
        when effective_location is not null
         and i.lat is not null
         and i.lng is not null
         and i.lat between -90 and 90
         and i.lng between -180 and 180
          then st_distance(
            st_setsrid(st_makepoint(i.lng, i.lat), 4326)::geography,
            effective_location
          )
        else null::double precision
      end as distance_meters
    from public.incidents i
    where i.created_at >= now() - feed_window
      and (
        selected_cat is null
        or i.category ilike selected_cat
        or i.category ilike selected_cat || ' %'
        or i.category ilike selected_cat || ' &%'
        or i.title ilike '%' || selected_cat || '%'
      )
      and (
        search_query is null
        or i.title ilike '%' || search_query || '%'
        or i.description ilike '%' || search_query || '%'
        or i.location_name ilike '%' || search_query || '%'
        or i.location ilike '%' || search_query || '%'
      )
      and (
        (
          effective_location is not null
          and i.lat is not null
          and i.lng is not null
          and i.lat between -90 and 90
          and i.lng between -180 and 180
          and st_dwithin(
            st_setsrid(st_makepoint(i.lng, i.lat), 4326)::geography,
            effective_location,
            feed_radius_meters
          )
        )
        or (
          normalized_user_county is not null
          and private.normalize_feed_county(i.county) = normalized_user_county
          and (
            effective_location is null
            or i.lat is null
            or i.lng is null
            or i.lat not between -90 and 90
            or i.lng not between -180 and 180
          )
        )
      )
  )
  select
    c.id,
    c.user_id,
    c.title,
    c.description,
    c.severity,
    c.category,
    c.location,
    c.anonymity,
    c.media_urls,
    c.status,
    c.created_at,
    c.updated_at,
    c.lat,
    c.lng,
    c.location_name,
    c.assigned_team_id,
    c.county,
    c.sub_county
  from candidates c
  order by
    (
      case
        when lower(c.severity) = 'critical' then 100
        when lower(c.severity) = 'high' then 70
        when lower(c.severity) = 'medium' then 40
        else 15
      end
      + case
          when c.distance_meters is not null
            then greatest(0, 60 - (c.distance_meters / 333.333333))
          else 8
        end
      + coalesce(least(25, (user_affinity ->> c.category)::int * 5), 0)
      + greatest(0, 20 - (extract(epoch from (now() - c.created_at)) / 86400.0 * 3))
    ) desc,
    c.created_at desc
  limit 50;
end;
$function$;
