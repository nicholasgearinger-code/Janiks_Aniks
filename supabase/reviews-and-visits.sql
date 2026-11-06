-- Run once in Supabase SQL Editor. Reviews are displayed regardless of rating once approved.
create table if not exists public.customer_reviews(
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 display_name text not null check (char_length(display_name) between 2 and 60),
 rating smallint not null check (rating between 1 and 5),
 body text not null check (char_length(body) between 15 and 1200),
 status text not null default 'pending' check (status in ('pending','approved','rejected'))
);
create index if not exists customer_reviews_public_idx on public.customer_reviews (status,rating,created_at desc);
alter table public.customer_reviews enable row level security;
revoke all on public.customer_reviews from anon,authenticated;
grant select on public.customer_reviews to anon,authenticated;
grant update(status) on public.customer_reviews to authenticated;
drop policy if exists "Public reads approved reviews" on public.customer_reviews;
create policy "Public reads approved reviews" on public.customer_reviews for select to anon,authenticated
using(status='approved');
drop policy if exists "Owners read all reviews" on public.customer_reviews;
create policy "Owners read all reviews" on public.customer_reviews for select to authenticated
using(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
drop policy if exists "Owners moderate reviews" on public.customer_reviews;
create policy "Owners moderate reviews" on public.customer_reviews for update to authenticated
using(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())))
with check(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
-- Only review-submit Edge Function can INSERT (service role); visitors cannot write directly.

-- Privacy-conscious approximate unique-browser visits, without IP addresses or user agents.
create table if not exists public.site_visit_days(
 visit_day date not null,
 visitor_hash text not null check (char_length(visitor_hash)=64),
 first_seen timestamptz not null default now(),
 primary key(visit_day,visitor_hash)
);
create index if not exists site_visit_days_visitor_idx on public.site_visit_days(visitor_hash);
alter table public.site_visit_days enable row level security;
revoke all on public.site_visit_days from anon,authenticated;
-- Inserts are service-role only through the website-visit Edge Function.

-- Admin-only aggregate, never exposes visitor hashes to the browser.
create or replace function public.admin_visit_summary()
returns table(visitors_today bigint,visitors_30d bigint,visitors_all_time bigint)
language plpgsql security definer set search_path = ''
as $$
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.store_admins a where a.user_id=(select auth.uid())
 ) then raise exception 'Not authorized' using errcode='42501'; end if;
 return query select
  count(distinct v.visitor_hash) filter(where v.visit_day=(now() at time zone 'Asia/Manila')::date),
  count(distinct v.visitor_hash) filter(where v.visit_day >= (now() at time zone 'Asia/Manila')::date - 29),
  count(distinct v.visitor_hash)
 from public.site_visit_days v;
end;$$;
revoke all on function public.admin_visit_summary() from public,anon;
grant execute on function public.admin_visit_summary() to authenticated;
