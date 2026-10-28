-- Janiks Aniks inventory extension. Run after schema.sql and orders.sql.
-- Nullable stock means not tracked; zero means sold out. Existing products remain unchanged.
alter table public.products add column if not exists stock_quantity integer check (stock_quantity >= 0);
alter table public.products add column if not exists low_stock_threshold integer not null default 3 check(low_stock_threshold >= 0);
create table if not exists public.inventory_adjustments(
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 changed_by uuid not null references auth.users(id),
 old_quantity integer,
 new_quantity integer not null check(new_quantity>=0),
 reason text not null check(length(trim(reason)) between 3 and 300),
 created_at timestamptz not null default now()
);
alter table public.inventory_adjustments enable row level security;
revoke all on public.inventory_adjustments from anon,authenticated;
grant select on public.inventory_adjustments to authenticated;
create policy "Admins view inventory history" on public.inventory_adjustments for select to authenticated
using(exists(select 1 from public.store_admins where user_id=(select auth.uid())));
create or replace function public.adjust_inventory(p_product_id uuid,p_new_quantity integer,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare old_stock integer; who uuid:=(select auth.uid());
begin
 if who is null or not exists(select 1 from public.store_admins where user_id=who) then raise exception 'Not authorized';end if;
 if p_new_quantity is null or p_new_quantity<0 or p_new_quantity>1000000 then raise exception 'Invalid quantity';end if;
 if length(trim(coalesce(p_reason,''))) not between 3 and 300 then raise exception 'Reason required';end if;
 select stock_quantity into old_stock from public.products where id=p_product_id for update;
 if not found then raise exception 'Product not found';end if;
 update public.products set stock_quantity=p_new_quantity where id=p_product_id;
 insert into public.inventory_adjustments(product_id,changed_by,old_quantity,new_quantity,reason)
 values(p_product_id,who,old_stock,p_new_quantity,trim(p_reason));
end $$;
revoke all on function public.adjust_inventory(uuid,integer,text) from public;
grant execute on function public.adjust_inventory(uuid,integer,text) to authenticated;
-- Inventory is NOT yet reserved/deducted automatically by checkout.
