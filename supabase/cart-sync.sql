-- Run after supabase/customers.sql. Cart stores product slugs and quantities only.
create table if not exists public.customer_cart_items (
 user_id uuid not null references auth.users(id) on delete cascade,
 product_slug text not null check(product_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
 quantity integer not null check(quantity between 1 and 99),
 updated_at timestamptz not null default now(),
 primary key(user_id,product_slug)
);
alter table public.customer_cart_items enable row level security;
revoke all on public.customer_cart_items from anon,authenticated;
grant select,insert,update,delete on public.customer_cart_items to authenticated;
drop policy if exists "Customers read own cart" on public.customer_cart_items;
create policy "Customers read own cart" on public.customer_cart_items for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Customers add own cart items" on public.customer_cart_items;
create policy "Customers add own cart items" on public.customer_cart_items for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "Customers update own cart items" on public.customer_cart_items;
create policy "Customers update own cart items" on public.customer_cart_items for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Customers remove own cart items" on public.customer_cart_items;
create policy "Customers remove own cart items" on public.customer_cart_items for delete to authenticated using(user_id=(select auth.uid()));
