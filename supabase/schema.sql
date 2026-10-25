-- Janiks Aniks: owner-only product management for a GitHub Pages storefront.
-- Run this entire file in Supabase SQL Editor after creating a Supabase project.
-- Then create your owner user in Authentication > Users and run the owner bootstrap
-- statement in ADMIN_SETUP.md. This SQL does not create or activate any user account.

create extension if not exists pgcrypto;

create table if not exists public.store_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 160),
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  image_url text not null default '',
  category text not null check (category in ('mugs','plushies','accessories')),
  color text not null default '',
  tags text[] not null default '{}',
  available boolean not null default true,
  published boolean not null default false,
  payment_url text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.store_admins enable row level security;
alter table public.products enable row level security;

revoke all on table public.store_admins from anon, authenticated;
revoke all on table public.products from anon, authenticated;

-- Signed-in users can only verify their own allowlist row; only the database owner
-- (via SQL Editor) can add/remove store admins.
grant select on table public.store_admins to authenticated;
create policy "Admins can read their own allowlist row"
on public.store_admins for select to authenticated
using ((select auth.uid()) = user_id);

-- Public storefront can read published products only.
grant select on table public.products to anon, authenticated;
create policy "Anyone can read published products"
on public.products for select to anon, authenticated
using (published = true);

-- The owner allowlist is the authorization source for all product mutations.
grant insert, update, delete on table public.products to authenticated;
create policy "Store admins can read all products"
on public.products for select to authenticated
using (exists (
  select 1 from public.store_admins a where a.user_id = (select auth.uid())
));
create policy "Store admins can insert products"
on public.products for insert to authenticated
with check (exists (
  select 1 from public.store_admins a where a.user_id = (select auth.uid())
));
create policy "Store admins can update products"
on public.products for update to authenticated
using (exists (
  select 1 from public.store_admins a where a.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.store_admins a where a.user_id = (select auth.uid())
));
create policy "Store admins can delete products"
on public.products for delete to authenticated
using (exists (
  select 1 from public.store_admins a where a.user_id = (select auth.uid())
));

-- Public product photos. Upload/update/delete remain restricted to allowlisted admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view product photos" on storage.objects;
create policy "Public can view product photos"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Store admins can upload product photos" on storage.objects;
create policy "Store admins can upload product photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.store_admins a where a.user_id = (select auth.uid()))
);

drop policy if exists "Store admins can update product photos" on storage.objects;
create policy "Store admins can update product photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.store_admins a where a.user_id = (select auth.uid()))
)
with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.store_admins a where a.user_id = (select auth.uid()))
);

drop policy if exists "Store admins can delete product photos" on storage.objects;
create policy "Store admins can delete product photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and exists (select 1 from public.store_admins a where a.user_id = (select auth.uid()))
);
