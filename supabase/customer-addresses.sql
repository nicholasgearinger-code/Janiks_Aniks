-- Run after supabase/customers.sql. Customers can maintain their own saved addresses.
create table if not exists public.customer_addresses(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 label text not null default 'Home' check(length(label) between 1 and 50),
 recipient_name text not null check(length(trim(recipient_name)) between 2 and 120),
 phone text not null default '',
 line1 text not null check(length(trim(line1)) between 3 and 200),
 line2 text not null default '',
 barangay text not null default '',
 city text not null,
 province text not null,
 postal_code text not null default '',
 country text not null default 'PH' check(country='PH'),
 created_at timestamptz not null default now()
);
create index if not exists customer_addresses_user_idx on public.customer_addresses(user_id);
alter table public.customer_addresses enable row level security;
revoke all on public.customer_addresses from anon,authenticated;
grant select,insert,update,delete on public.customer_addresses to authenticated;
create policy "Customer reads own addresses" on public.customer_addresses for select to authenticated using(user_id=(select auth.uid()));
create policy "Customer inserts own addresses" on public.customer_addresses for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Customer updates own addresses" on public.customer_addresses for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Customer deletes own addresses" on public.customer_addresses for delete to authenticated using(user_id=(select auth.uid()));
-- Saved addresses are NOT delivery quotes and do not activate shipping checkout.
