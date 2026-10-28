-- Janiks Aniks customer accounts. Run in Supabase SQL Editor.
-- Supabase Auth manages passwords; never store passwords in these tables.
create table if not exists public.customer_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (length(display_name)<=100),
 phone text not null default '' check (length(phone)<=40),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.customer_wishlists (
 user_id uuid not null references auth.users(id) on delete cascade,
 product_slug text not null check (length(product_slug) between 1 and 180),
 created_at timestamptz not null default now(),
 primary key(user_id,product_slug)
);
alter table public.customer_profiles enable row level security;
alter table public.customer_wishlists enable row level security;
revoke all on public.customer_profiles,public.customer_wishlists from anon,authenticated;
grant select,insert,update on public.customer_profiles to authenticated;
grant select,insert,delete on public.customer_wishlists to authenticated;
drop policy if exists "Customers view own profile" on public.customer_profiles;
create policy "Customers view own profile" on public.customer_profiles for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Customers create own profile" on public.customer_profiles;
create policy "Customers create own profile" on public.customer_profiles for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "Customers edit own profile" on public.customer_profiles;
create policy "Customers edit own profile" on public.customer_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Customers view own wishlist" on public.customer_wishlists;
create policy "Customers view own wishlist" on public.customer_wishlists for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Customers add own wishlist" on public.customer_wishlists;
create policy "Customers add own wishlist" on public.customer_wishlists for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "Customers remove own wishlist" on public.customer_wishlists;
create policy "Customers remove own wishlist" on public.customer_wishlists for delete to authenticated using(user_id=(select auth.uid()));
