-- Run AFTER supabase/cart-sync.sql.
-- Atomic, versioned cart state. Old customer_cart_items remains for migration only.
create table if not exists public.customer_cart_state(
 user_id uuid primary key references auth.users(id) on delete cascade,
 items jsonb not null default '[]'::jsonb,
 version bigint not null default 0 check(version>=0),
 updated_at timestamptz not null default now(),
 constraint cart_items_array check(jsonb_typeof(items)='array')
);
alter table public.customer_cart_state enable row level security;
revoke all on public.customer_cart_state from anon,authenticated;
grant select on public.customer_cart_state to authenticated;
drop policy if exists "Customer reads own versioned cart" on public.customer_cart_state;
create policy "Customer reads own versioned cart" on public.customer_cart_state for select to authenticated using(user_id=(select auth.uid()));

-- Import previous cart once. Preserve any existing versioned carts.
insert into public.customer_cart_state(user_id,items)
select user_id,jsonb_agg(jsonb_build_object('slug',product_slug,'quantity',quantity) order by product_slug)
from public.customer_cart_items group by user_id
on conflict(user_id) do nothing;

create or replace function public.cart_compare_and_swap(expected_version bigint,new_items jsonb)
returns table(applied boolean,current_version bigint,current_items jsonb)
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid()); rec public.customer_cart_state%rowtype; entry jsonb; slug text; qty integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if expected_version is null or expected_version<0 then raise exception 'Invalid version'; end if;
 if new_items is null or jsonb_typeof(new_items)<>'array' or jsonb_array_length(new_items)>100 then raise exception 'Invalid cart'; end if;
 for entry in select value from jsonb_array_elements(new_items) loop
  if jsonb_typeof(entry)<>'object' or jsonb_typeof(entry->'slug')<>'string'
    or jsonb_typeof(entry->'quantity')<>'number' then raise exception 'Invalid cart item'; end if;
  slug:=entry->>'slug';
  if slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(slug)>180 then raise exception 'Invalid product slug'; end if;
  if (entry->>'quantity') !~ '^[0-9]{1,2}$' then raise exception 'Invalid quantity'; end if;
  qty:=(entry->>'quantity')::integer;
  if qty<1 or qty>99 then raise exception 'Invalid quantity'; end if;
 end loop;
 if (select count(distinct value->>'slug') from jsonb_array_elements(new_items))<>jsonb_array_length(new_items) then raise exception 'Duplicate cart item'; end if;
 insert into public.customer_cart_state(user_id) values(uid) on conflict(user_id) do nothing;
 select * into rec from public.customer_cart_state where user_id=uid for update;
 if rec.version<>expected_version then
  return query select false,rec.version,rec.items;return;
 end if;
 update public.customer_cart_state set items=new_items,version=version+1,updated_at=now() where user_id=uid;
 return query select true,rec.version+1,new_items;
end $$;
revoke all on function public.cart_compare_and_swap(bigint,jsonb) from public;
grant execute on function public.cart_compare_and_swap(bigint,jsonb) to authenticated;
-- Cart data is never a trusted source of price, availability, or inventory at checkout.
