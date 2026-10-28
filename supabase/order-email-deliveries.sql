-- Run in Supabase SQL Editor before deploying send-order-email.
-- Owner-only function writes this ledger via service role; no browser grants.
create table if not exists public.order_email_deliveries (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 email_type text not null check(email_type in ('order_received')),
 recipient text not null,
 status text not null check(status in ('sending','accepted','failed')),
 provider_message_id text not null default '',
 error_message text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(order_id,email_type)
);
alter table public.order_email_deliveries enable row level security;
revoke all on public.order_email_deliveries from anon,authenticated;
-- Do not add public RLS policies. Only trusted service-role code accesses this table.
