# Contact Inbox rollout (staged)

The existing working Contact Us form remains active on the deployed Supabase function until you explicitly redeploy it.

1. Open Supabase SQL Editor in your Janiks Aniks project and run `supabase/contact-inquiries.sql`. This creates a private `contact_inquiries` table with access restricted to users in `store_admins`. Never grant anonymous SELECT.
2. Open Supabase Edge Functions > `contact-inquiry` > Edit and replace its code with `supabase/functions/contact-inquiry/index.ts` from GitHub, then deploy updates. Keep **Verify JWT disabled only for this public contact function**; Cloudflare Turnstile is verified server-side. The existing `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_TO_EMAIL` secrets remain in Supabase.
3. Open `https://janiksaniks.com/admin.html` > Inbox. New inquiries should appear with New, In progress, and Resolved statuses; the Reply link opens your normal email app. No inbox auto-reply sending occurs when status changes.
4. Submit a test from the public Contact Us page and verify all three outcomes: contact notification reaches the shop inbox, acknowledgment arrives at the test customer's address, and the inquiry appears in Store Manager. Check Resend logs for both sends.
5. Configure Cloudflare WAF / rate limiting for the POST to `/functions/v1/contact-inquiry` when requests are routed through your own domain/proxy. **Important:** the current browser calls `*.supabase.co` directly, so rules on `janiksaniks.com` do NOT govern those requests. Configure rate-limiting at the backend/edge or route through a suitably protected Cloudflare Worker first. Turnstile alone is not a full rate limit.
6. Test malicious/invalid input, Turnstile rejection, unauthorized inbox access, and status changes. Adopt an inquiry-retention policy since submissions contain customer personal data.

Current caveats: Inquiry insertion and Resend delivery are not one atomic transaction. If Resend rejects the shop message after insertion, a customer may retry and create another inquiry; use inbox deduplication / durable delivery queue before high-volume launch. Acknowledgment failure is logged, does not negate receipt of the inquiry, and is shown by the acknowledgment timestamp in the inbox. Owner notifications in existing personal inbox continue.
