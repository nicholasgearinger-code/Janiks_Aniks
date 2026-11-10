-- Run ONCE in the Supabase SQL Editor before using the multi-photo editor.
-- Existing main product photo stays in products.image_url; additional images are
-- stored in their display order in products.image_urls.
alter table public.products
  add column if not exists image_urls text[] not null default '{}'::text[];

-- Do not change existing product rows, RLS policies or storage permissions.
comment on column public.products.image_urls is
  'Up to five optional extra product image URLs, ordered for the storefront gallery. The primary photo remains image_url.';
