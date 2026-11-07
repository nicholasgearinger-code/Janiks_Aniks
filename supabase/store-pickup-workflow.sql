-- Janiks Aniks: pickup-only fulfillment stages for prepaid GCash orders.
-- Run after supabase/orders.sql and supabase/customer-order-history.sql.
-- Compatible with legacy status values in existing orders.
alter table public.orders drop constraint if exists orders_fulfillment_status_check;
alter table public.orders add constraint orders_fulfillment_status_check
 check (fulfillment_status in (
  'pending','confirmed','processing','shipped','delivered','cancelled',
  'in_transit_to_store','ready_for_pickup','collected'
 ));

-- Enforce payment-first workflow on the database, not just the UI.
-- The payment status is changed ONLY by the trusted confirmation endpoint.
create or replace function public.janiks_guard_pickup_fulfillment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
 if new.fulfillment_status is distinct from old.fulfillment_status then
  if old.fulfillment_status in ('cancelled','collected') then
   raise exception 'Closed orders cannot change fulfillment status';
  end if;
  if new.fulfillment_status in (
    'confirmed','processing','shipped','delivered',
    'in_transit_to_store','ready_for_pickup','collected'
   ) and new.payment_status <> 'paid' then
   raise exception 'Payment must be verified before order transfer or collection';
  end if;
  if new.fulfillment_status='ready_for_pickup' and
   old.fulfillment_status not in ('in_transit_to_store','shipped','ready_for_pickup') then
   raise exception 'Order must reach the store before being ready for pickup';
  end if;
  if new.fulfillment_status='collected' and
   old.fulfillment_status <> 'ready_for_pickup' then
   raise exception 'Only ready-for-pickup orders can be marked collected';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists janiks_guard_pickup_fulfillment on public.orders;
create trigger janiks_guard_pickup_fulfillment
 before update on public.orders
 for each row execute function public.janiks_guard_pickup_fulfillment();

-- Business meaning:
-- pending: not yet verified; confirmed: paid; processing: preparing transfer;
-- in_transit_to_store: traveling to pickup location;
-- ready_for_pickup: physically present and staff-verified;
-- collected: handed to customer.
-- No automatic pickup-ready email is created by this migration.
