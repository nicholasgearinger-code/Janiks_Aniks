# Contact Us form setup

Contact page: https://janiksaniks.com/contact.html

The form is disabled by default until its email recipient, Turnstile protection and Supabase Edge Function are configured.

1. In Cloudflare Dashboard > Turnstile, create a widget for hostname `janiksaniks.com`. Copy its public site key and private secret.
2. In Supabase > Edge Functions > Secrets, set `TURNSTILE_SECRET_KEY` to the private Turnstile secret. Set `CONTACT_TO_EMAIL` to an inbox you actually receive mail at (for example an existing personal/work inbox). Keep `RESEND_API_KEY` set. Do not post the secret or private email address in GitHub.
3. Deploy `supabase/functions/contact-inquiry/index.ts` as a Supabase Edge Function named `contact-inquiry`. Because anonymous visitors should be able to send inquiries, disable Supabase's gateway **Verify JWT** for this specific function only. The function enforces Cloudflare Turnstile checks and rejects unauthorized origins. Do not disable JWT for other functions.
4. Edit the public `supabase-config.js`: `turnstileSiteKey: 'YOUR_PUBLIC_SITE_KEY'` and `contactFormEnabled: true`.
5. Test from https://janiksaniks.com/contact.html and verify delivery at `CONTACT_TO_EMAIL` and in Resend Logs. Check product, order, other inquiries, reply-to behavior, blank fields, expired Turnstile, and mobile layout.
6. For production, add per-IP rate limiting (e.g. Cloudflare WAF/rate rules), monitoring, and retention/privacy policies for contact messages. Turnstile reduces spam but is not a complete rate limit.

Resend's API sends the message FROM verified `orders@janiksaniks.com` TO `CONTACT_TO_EMAIL`, and sets reply-to to the customer's entered address. Domain verification to send from orders@janiksaniks.com does not automatically create a mailbox for receiving replies.
