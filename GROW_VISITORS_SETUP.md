# Janiks Aniks — Discoverability and Referral Analytics Setup

## Already present in the storefront
- Root sitemap: https://janiksaniks.com/sitemap.xml
- Robots guide: https://janiksaniks.com/robots.txt
- Descriptive titles, canonical URLs and social preview tags on public pages.
- Visit Us includes city-level Store structured data and the prepaid store-pickup rule.
- The **original unique-browser visitor counter remains unchanged**.

## 1. Google Search Console — requires store owner
1. Sign in to https://search.google.com/search-console with the store's Google account.
2. Add the domain property `janiksaniks.com`. Verify ownership using the DNS TXT record Google gives you in Cloudflare; don't replace existing DNS records.
3. Under **Sitemaps**, submit `https://janiksaniks.com/sitemap.xml`.
4. Use **URL Inspection** for `https://janiksaniks.com/` and `https://janiksaniks.com/visit.html`; request indexing if needed.
5. Review indexing issues over time; Google indexing is not immediate or guaranteed.

## 2. Google Business Profile — only if eligible
Start at https://business.google.com/ .
- Only register the booth as a business if it has in-person customer contact during stated hours, the business owner is authorized to represent the site, and it meets Google eligibility/signage requirements.
- Use the **actual verified** store/booth location and hours; do not invent hours, phone numbers, store photos or claimed permanent signage.
- Add `https://janiksaniks.com/` as website and the Visit Us URL where appropriate.
- Google may require verification. Creating/claiming an account must be done by its owner.

## 3. Social traffic
Use truthful photos of new products, booth, and collections, linking visitors to an appropriate page.
Suggested tagged link patterns (each link records only a general source bucket once referral tracking is enabled):
- Facebook: `https://janiksaniks.com/?utm_source=facebook&utm_medium=social`
- Instagram: `https://janiksaniks.com/?utm_source=instagram&utm_medium=social`
- TikTok: `https://janiksaniks.com/?utm_source=tiktok&utm_medium=social`
Do not include customers' names, emails, order details or other personal data in URLs.
No real social account links were added because none have been verified.

## 4. Optional referral analytics: NOT ACTIVE YET
The original `website-visit` collector and existing visitor counts continue to work without this feature. The new feature is deliberately independent.

To activate:
1. Review and publish a suitable privacy disclosure about storing a browser identifier and aggregated referral sources, including any applicable consent requirements.
2. Run `supabase/referral-analytics.sql` in **Supabase SQL Editor**. This creates separate service-role-only rows and an admin-only summary function.
3. Deploy `supabase/functions/referral-visit/index.ts` as a NEW Edge Function named `referral-visit`. **Disable Verify JWT for this public endpoint only**; it validates origin, UUID format and a fixed allowlist of source categories.
4. Ensure the existing `VISITOR_HASH_SECRET` (at least 32 unpredictable characters) and Supabase built-in server variables are accessible to that function. Do not disclose or commit secret values.
5. Only when those steps pass, set `referralTrackingEnabled: true` in `supabase-config.js` and deploy that config. It's currently `false` so no extra network request is made.
6. Open your site in a fresh private browser with `?utm_source=instagram&utm_medium=social`. Check `referral-visit` Invocations: POST should return 204, and run:
   `select source,count(*) from public.site_referral_days group by source order by source;`
7. Sign into Store Manager → Overview and select Refresh; the new **Where visitors find us** list should show rows for the past 30 days.

## Analytics caveats
- Sources are broad labels only: Direct, Google, Facebook, Instagram, TikTok, Other search, Other social, Other website. No raw referral URLs or campaign parameter values are stored.
- One hashed browser ID per Manila calendar day is recorded in the separate referral table. It is an estimate, not unique people or pageview analytics. Social apps sometimes remove referring information, so some visits appear as Direct.
- Referral rows track one source per browser/day. They do NOT retroactively label earlier visitors or necessarily match the original all-time total.
- Origin checks alone do not prevent forged/spam traffic. If needed, add abuse monitoring/rate limits at higher traffic.
- The browser must allow script execution, localStorage, and requests. Do not claim GDPR or other privacy-law compliance without legal review.
