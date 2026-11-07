-- Janiks Aniks: secure customer order history.
-- Run AFTER supabase/orders.sql and supabase/customers.sql.
-- Existing unlinked orders remain private until an owner securely verifies and
-- assigns their account IDs. Never infer ownership from a user-editable email.
alter table public.orders
 add column if not exists customer_user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_customer_history_idx
 on public.orders(customer_user_id,created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Existing store-admin policies and their permissions remain unchanged.
drop policy if exists "Customers view their own orders" on public.orders;
create policy "Customers view their own orders"
 on public.orders for select to authenticated
 using (customer_user_id=(select auth.uid()));

drop policy if exists "Customers view items from their own orders" on public.order_items;
create policy "Customers view items from their own orders"
 on public.order_items for select to authenticated
 using (exists (
   select 1 from public.orders o
   where o.id=order_id and o.customer_user_id=(select auth.uid())
 ));

-- A separate policy never grants write access. Only server-side checkout creates
-- orders with customer_user_id from the validated JWT; do not trust form input.
-- Do not grant update of customer_user_id to authenticated customers.
revoke update (customer_user_id) on public.orders from authenticated;
