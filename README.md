# Janiks Aniks site

Files: index.html, styles.css, images/

## Fill in the placeholders (search index.html for square brackets)
- ₱[PRICE] on each collection card
- [YOUR_FORM_ID] in the Sign up form (free at formspree.io)
- [INSTAGRAM URL], [FACEBOOK URL], [BOOTH HOURS], [SHIPPING AND RETURNS INFO]
- PAY_LINKS near the bottom of index.html: paste a PayMongo (or HitPay) payment link per collection, then each Buy button opens it

## Deploy
1. Make a new GitHub repo and upload these files at the repo root.
2. Cloudflare Pages: Create > Connect to Git > pick the repo. No build command, output directory "/".


## Owner product manager
- Setup guide: [ADMIN_SETUP.md](ADMIN_SETUP.md)
- Private owner manager page: `admin.html`
- Supabase database/storage policies: `supabase/schema.sql`
- Browser-safe project config: `supabase-config.js` (project URL + publishable key only; never a service-role/secret key)

The admin and live database catalog remain inactive until Supabase is configured and the owner account is added to the `store_admins` allowlist. See the setup guide before use.
