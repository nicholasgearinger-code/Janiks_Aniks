# Product-specific customer reviews with photos

The GitHub Pages frontend, Store Manager review moderation, and Supabase Edge Function source are committed. **Not live until the SQL and functions are deployed in the Supabase dashboard.**

## 1. SQL setup
Run `supabase/product-reviews.sql` once in Supabase → SQL Editor. This adds nullable `product_slug` and `photo_path` to the existing `customer_reviews` table, plus a **private** `review-photos` Storage bucket and an admin-only read policy. Existing reviews, accounts, and orders are preserved.

## 2. Deploy functions
Update the existing `review-submit` Edge Function from `supabase/functions/review-submit/index.ts`; deploy the new `product-reviews` Edge Function from `supabase/functions/product-reviews/index.ts`. Both are public endpoints with application-level origin validation; disable Supabase's Verify JWT only for these two public functions. **Do not change admin functions' JWT settings.** Ensure server-side `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `TURNSTILE_SECRET_KEY` are configured. Never place these in frontend source.

## 3. Customer flow
A real, published product page at `product.html?slug=...` shows its approved customer reviews and offers a 1–5 star form, optional photo (JPEG/PNG/WebP up to 1 MB), display name, review text, and Cloudflare Turnstile. A photo is uploaded privately through the verified Edge Function; submissions remain **pending** and are not shown until approved. The sample-mug preview cannot submit reviews.

## 4. Admin flow
Open Store Manager → Reviews. Pending product reviews show their product slug and signed private image preview. Approve or reject using the existing moderation buttons. Approval makes text publicly readable and makes the approved photo accessible only through a short-lived signed URL returned by `product-reviews`. Rejected/pending photos are not shown publicly. Moderation also supports existing general store reviews.

## 5. Verification checklist
1. Open a published product and confirm an empty review state appears if it has no reviews.
2. Submit 4 stars, text, and a sample photo; confirm its status is pending and photo is visible to admin.
3. Confirm neither pending text nor photo appears publicly.
4. Approve it; refresh the product page and confirm rating, text, photo, and the updated product-header rating.
5. Test no-photo review, invalid file, 1-star review, mobile display, and a review on a different product.
6. Verify existing homepage reviews and the standalone reviews page still work.
7. Test GCash checkout, favorites, synced cart, order history, and admin navigation for regressions.

**Important:** The summary currently covers the newest 30 approved reviews per product, not an all-time aggregate. Existing general store reviews with a null `product_slug` remain on the main reviews page and will not be incorrectly attributed to a product.
