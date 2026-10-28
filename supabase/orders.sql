-- Run in Supabase SQL Editor after supabase/schema.sql.
-- Orders are inserted only by trusted server-side checkout code (not public browsers).
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 order_number text not null unique,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 customer_name text not null,
 customer_email text not null,
 customer_phone text not null default '',
 shipping_address jsonb not null default '{}'::jsonb,
 shipping_method text not null default '',
 shipping_fee numeric(12,2) not null default 0 check(shipping_fee>=0),
 subtotal numeric(12,2) not null check(subtotal>=0),
 total numeric(12,2) not null check(total>=0),
 currency text not null default 'PHP' check(currency='PHP'),
 payment_status text not null default 'unpaid' check(payment_status in ('unpaid','pending','paid','refunded','failed')),
 fulfillment_status text not null default 'pending' check(fulfillment_status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
 courier text not null default '',
 tracking_number text not null default '',
 fulfillment_notes text not null default '',
 customer_notes text not null default '',
 payment_provider text not null default '',
 provider_reference text not null default ''
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 product_name text not null,
 quantity integer not null check(quantity>0),
 unit_price numeric(12,2) not null check(unit_price>=0),
 line_total numeric(12,2) not null check(line_total>=0)
);
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
grant update (fulfillment_status,courier,tracking_number,fulfillment_notes) on public.orders to authenticated;
drop policy if exists "Store admins view orders" on public.orders;
create policy "Store admins view orders" on public.orders for select to authenticated
using (exists(select 1 from public.store_admins where user_id=(select auth.uid())));
drop policy if exists "Store admins manage fulfillment" on public.orders;
create policy "Store admins manage fulfillment" on public.orders for update to authenticated
using (exists(select 1 from public.store_admins where user_id=(select auth.uid())))
with check (exists(select 1 from public.store_admins where user_id=(select auth.uid())));
drop policy if exists "Store admins view order items" on public.order_items;
create policy "Store admins view order items" on public.order_items for select to authenticated
using (exists(select 1 from public.store_admins where user_id=(select auth.uid())));
-- No anon/authenticated INSERT or DELETE grants: checkout must use a trusted backend.
-- Payment status updates must be performed by a trusted webhook handler, never the browser.
