-- Run after supabase/schema.sql and supabase/orders.sql.
-- Expenses can only be viewed/managed by allowlisted store admins.
create table if not exists public.business_expenses (
 id uuid primary key default gen_random_uuid(),
 expense_date date not null,
 category text not null check (length(category) between 1 and 80),
 description text not null default '',
 amount numeric(12,2) not null check (amount > 0),
 created_at timestamptz not null default now()
);
alter table public.business_expenses enable row level security;
revoke all on public.business_expenses from anon,authenticated;
grant select,insert,delete on public.business_expenses to authenticated;
drop policy if exists "Admins view expenses" on public.business_expenses;
create policy "Admins view expenses" on public.business_expenses for select to authenticated
using (exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
drop policy if exists "Admins add expenses" on public.business_expenses;
create policy "Admins add expenses" on public.business_expenses for insert to authenticated
with check (exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
drop policy if exists "Admins delete expenses" on public.business_expenses;
create policy "Admins delete expenses" on public.business_expenses for delete to authenticated
using (exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
-- Cost snapshot is set only by trusted checkout backend when an order item is created.
alter table public.order_items add column if not exists unit_cost numeric(12,2)
check (unit_cost is null or unit_cost >= 0);
-- Existing orders retain NULL cost: do not fabricate margins.
