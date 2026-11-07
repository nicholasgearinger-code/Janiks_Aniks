-- Optional referral source analytics. Run in Supabase SQL Editor BEFORE deploying referral-visit.
-- Does not change the existing working site_visit_days visitor counter.
create table if not exists public.site_referral_days(
 visit_day date not null,
 visitor_hash text not null check (length(visitor_hash)=64),
 source text not null check (source in ('Direct','Google','Facebook','Instagram','TikTok','Other search','Other social','Other website')),
 first_seen timestamptz not null default now(),
 primary key(visit_day,visitor_hash)
);
create index if not exists site_referral_days_day_idx on public.site_referral_days(visit_day);
alter table public.site_referral_days enable row level security;
revoke all on public.site_referral_days from anon,authenticated;
-- Service role only: insert through referral-visit Edge Function.

create or replace function public.admin_referral_summary()
returns table(source text,visitors_30d bigint)
language plpgsql security definer set search_path=''
as $$
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.store_admins s where s.user_id=(select auth.uid())
 ) then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 return query
 select r.source,count(distinct r.visitor_hash)::bigint
 from public.site_referral_days r
 where r.visit_day >= (now() at time zone 'Asia/Manila')::date-29
 group by r.source
 order by count(distinct r.visitor_hash) desc,r.source;
end;
$$;
revoke all on function public.admin_referral_summary() from public,anon;
grant execute on function public.admin_referral_summary() to authenticated;
