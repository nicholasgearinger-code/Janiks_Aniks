# Janiks Aniks customer account setup

1. Open your existing Supabase project and run `supabase/customers.sql` in SQL Editor. This adds private profiles and wishlists protected by row-level security.
2. In **Authentication → Providers → Email**, enable email/password registration and decide whether email confirmation is required. Configure a production SMTP provider for reliable verification and password-reset messages.
3. In **Authentication → URL Configuration**, set the Site URL to `https://nicholasgearinger-code.github.io/Janiks_Aniks/` and add `https://nicholasgearinger-code.github.io/Janiks_Aniks/account.html` as an allowed redirect URL.
4. Test registration, email confirmation, login, sign-out, password reset, profile editing, and saving/removing a favorite in a private browser session.

**Security:** The public Supabase publishable key is expected in the browser; never expose the service-role key. Each customer can only access their own profile and wishlist through RLS. Store admins continue using the separate allowlist in `store_admins`. The account page does not display orders until checkout securely associates an order with the authenticated customer. Do not enable public read access to orders or customer addresses.

**Not included yet:** customer order history, saved shipping addresses, checkout integration, transactional emails, and cross-device cart synchronization before this migration. The guest cart remains browser-local. Wishlist saves only product slugs; removed or unpublished products may show their slug until the item is available again.

## Cross-device shopping bag
Run [supabase/cart-sync.sql](supabase/cart-sync.sql) after `supabase/customers.sql`. Signed-in customers' cart items are saved in `customer_cart_items` with user-only RLS. Existing guest cart items merge into the account cart on first sign-in; for duplicate products the cloud quantity is retained. Local changes synchronize after a short delay. Open the same account on another device to access saved items. The storefront still validates availability and pricing from the current catalog, and checkout is not enabled by this feature.

**Testing:** Sign in on phone and desktop; add a product on one device, refresh the other, change quantities, remove an item, clear the bag, and sign out. Verify customer A cannot read or change customer B's cart. Cart sync is best-effort and may require a refresh to see changes from another device. Do not treat client cart quantities or prices as trusted checkout data.

## Conflict-safe cart upgrade (version 2)
Run [supabase/cart-conflicts.sql](supabase/cart-conflicts.sql) after the existing `cart-sync.sql` migration. It imports existing saved cart items into a new versioned cart record, with one atomic, authenticated compare-and-swap RPC for updates. The client merges conflicts per product: the device that most recently edited a particular product wins when that device successfully retries; changes to other products are preserved. A 15-second visible-tab refresh, focus refresh and same-device storage notifications keep the cart current without reloading. Sign-out clears the previous account's local cart to prevent accidental exposure on shared devices.

**Limitations:** This is eventual synchronization, not a real-time push channel. Simultaneous edits to the *same* product may resolve in favor of the later successful retry. Failed writes remain on the device but are not guaranteed to upload until the next successful interaction or refresh. Product prices and stock must still be revalidated server-side at checkout. Do not run the migration before the earlier cart table exists. Test migrations on a staging Supabase project first.
