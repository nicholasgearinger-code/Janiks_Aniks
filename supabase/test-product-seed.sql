-- Janiks Aniks: optional editable test mug for Store Manager.
-- Run in Supabase SQL Editor. Safe to rerun: existing listing is NEVER overwritten.
-- Draft and not purchasable by default. Set published=true and available=true
-- ONLY for a controlled product-review end-to-end test, then revert to draft.
insert into public.products
 (slug,name,description,price,image_url,category,color,tags,available,published,payment_url,sort_order)
values
 ('test-cherry-bow-mug',
  'Cherry Bow Mug — TEST PRODUCT',
  'TEST LISTING — NOT FOR SALE. Sample product for checking photos, product details and customer reviews. Replace the name, description, price and photos with genuine product information before selling.',
  499.00,
  'https://janiksaniks.com/images/sample-cherry-bow-mug.svg',
  'mugs',
  'pink',
  array['test','sample'],
  false,
  false,
  '',
  9990)
on conflict (slug) do nothing;

select id,slug,name,price,published,available,image_url
from public.products where slug='test-cherry-bow-mug';
