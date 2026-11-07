# Janiks Aniks — Customer Order History and Search Visibility

## What has been committed
- **My Account > My orders**: recent orders, per-item quantities and amounts, payment state, pickup progress, refresh control, mobile styling.
- **Customer ownership**: new `orders.customer_user_id` column, customer-only SELECT policies for orders and their items; existing admin access remains.
- **New checkout orders**: `create-gcash-order` now records the **validated Supabase Auth user ID**, never a browser-provided ID.
- **SEO**: public-page descriptive titles and meta descriptions, canonical URLs, Open Graph summaries, `robots.txt`, `sitemap.xml`, website structured data, and private-page noindex directives.
- **Performance**: homepage hero image priority, deferred decoding, lazy loading of below-fold homepage collection stickers, Supabase preconnect, and removal of duplicate decorative markup.

## Activate order history (required)
1. Open **Supabase SQL Editor** and execute the complete file `supabase/customer-order-history.sql`. The original `supabase/orders.sql` and customer account tables should already exist.
2. Redeploy the existing **create-gcash-order** Edge Function using the updated `supabase/functions/create-gcash-order/index.ts`.
3. **Do not enable GCash checkout yet** until the verified QR/link, server-side `GCASH_ORDERS_ENABLED`, payment confirmation, and end-to-end testing are ready.
4. In customer My Account, sign in and expand **My orders**. Empty is expected if there are no linked orders.

### About existing historical orders
Previous orders do not contain `customer_user_id`; **they are deliberately not exposed merely because their email address matches an account**. An owner can link an older order after independently verifying identity, by setting its `customer_user_id` to the correct Auth user UUID through a trusted SQL admin workflow. Never expose this operation to customers or derive it from an unverified email claim.

## Test checklist
- Sign in with Customer A; submit a test order only in a safe test environment or after checkout is configured and verified.
- Confirm the newly created order contains Customer A's Auth user ID in `customer_user_id`.
- Confirm Customer A can read their own order and line items.
- Sign in with Customer B and verify Customer A's order and items are not visible.
- Confirm unauthenticated callers cannot read `orders` or `order_items`.
- Verify Store Manager still sees and updates existing orders.
- Confirm no `Ready for pickup` claim appears before an actual pickup readiness event. Current order schema has broad fulfillment states, **not yet a dedicated ready-for-pickup status**.
- Confirm mobile My Account layout and refresh control.

## Search and performance
- Open `https://janiksaniks.com/robots.txt` and `https://janiksaniks.com/sitemap.xml` after GitHub Pages deploys.
- Submit `https://janiksaniks.com/sitemap.xml` in Google Search Console.
- Confirm each static public page has a correct canonical URL, descriptive title, and valid image for shared social previews.
- Dynamic generic `category.html` and `product.html` are currently **noindex** while product-specific pages and SEO metadata are incomplete. Revisit this when actual product listings are available; public product SEO needs crawlable product-specific metadata, preferably static/pre-rendered routes.
- Compare mobile PageSpeed/Lighthouse results before and after deployment. This is a conservative code-level performance pass; no real-world Core Web Vitals or Lighthouse score has been measured here.

## Scope and caveats
- No real order was placed, no private customer data was inspected, and no production database/schema or Edge Function has been modified from this GitHub code commit alone.
- Order checkout remains disabled by configuration.
- Existing order confirmation emails are unchanged.
