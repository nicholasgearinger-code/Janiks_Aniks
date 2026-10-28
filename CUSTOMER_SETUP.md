# Janiks Aniks customer account setup

1. Open your existing Supabase project and run `supabase/customers.sql` in SQL Editor. This adds private profiles and wishlists protected by row-level security.
2. In **Authentication → Providers → Email**, enable email/password registration and decide whether email confirmation is required. Configure a production SMTP provider for reliable verification and password-reset messages.
3. In **Authentication → URL Configuration**, set the Site URL to `https://nicholasgearinger-code.github.io/Janiks_Aniks/` and add `https://nicholasgearinger-code.github.io/Janiks_Aniks/account.html` as an allowed redirect URL.
4. Test registration, email confirmation, login, sign-out, password reset, profile editing, and saving/removing a favorite in a private browser session.

**Security:** The public Supabase publishable key is expected in the browser; never expose the service-role key. Each customer can only access their own profile and wishlist through RLS. Store admins continue using the separate allowlist in `store_admins`. The account page does not display orders until checkout securely associates an order with the authenticated customer. Do not enable public read access to orders or customer addresses.

**Not included yet:** customer order history, saved shipping addresses, checkout integration, transactional emails, and cross-device cart synchronization. The existing cart remains browser-local. Wishlist saves only product slugs; removed or unpublished products may show their slug until the item is available again.
