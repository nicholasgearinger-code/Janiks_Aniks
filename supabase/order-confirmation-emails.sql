-- Email delivery audit table. Apply to Supabase before deploying send-order-confirmation.
create table if not exists public.order_confirmation_emails (
 order_id uuid primary key references public.orders(id) on delete cascade,
 state text not null check (state in ('sending','sent','failed')),
 resend_email_id text,
 last_error text,
 created_at timestamptz not null default now(),
 sent_at timestamptz
);
alter table public.order_confirmation_emails enable row level security;
revoke all on public.order_confirmation_emails from anon, authenticated;
