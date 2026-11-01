-- Contact inbox: run in Supabase SQL Editor before deploying upgraded contact-inquiry.
create table if not exists public.contact_inquiries (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 name text not null,
 email text not null,
 topic text not null,
 order_number text not null default '',
 message text not null,
 status text not null default 'new' check (status in ('new','in_progress','resolved')),
 owner_notified_at timestamptz,
 acknowledgment_sent_at timestamptz
);
create index if not exists contact_inquiries_created_idx on public.contact_inquiries(created_at desc);
alter table public.contact_inquiries enable row level security;
revoke all on public.contact_inquiries from anon,authenticated;
grant select on public.contact_inquiries to authenticated;
grant update(status) on public.contact_inquiries to authenticated;
drop policy if exists "Store admins can view inquiries" on public.contact_inquiries;
create policy "Store admins can view inquiries" on public.contact_inquiries for select to authenticated
using (exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
drop policy if exists "Store admins can update inquiry status" on public.contact_inquiries;
create policy "Store admins can update inquiry status" on public.contact_inquiries for update to authenticated
using (exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())))
with check (exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
