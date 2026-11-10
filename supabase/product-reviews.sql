-- Product-specific reviews and optional private customer photos.
-- Existing general store reviews remain intact and continue to display normally.
alter table public.customer_reviews add column if not exists product_slug text;
alter table public.customer_reviews add column if not exists photo_path text;
create index if not exists customer_reviews_product_public_idx on public.customer_reviews (product_slug,created_at desc) where status='approved';
create index if not exists customer_reviews_product_moderation_idx on public.customer_reviews (product_slug,status,created_at desc);
-- Bucket stays PRIVATE. Service-role Edge Function alone uploads;
-- approved photos are delivered via short-lived signed URLs.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('review-photos','review-photos',false,1048576,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=1048576,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
-- No anonymous write/read Storage policies are granted.
