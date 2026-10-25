# Janiks Aniks owner product manager setup

This adds a private owner login and a product editor to the existing GitHub Pages site. GitHub Pages remains the storefront host; Supabase supplies authentication, database storage, and product photo storage. The owner manager will not work until you complete the setup below.

## 1. Create the backend
1. Create a project at [Supabase](https://supabase.com/dashboard). Choose a strong database password and keep it private.
2. In the Supabase SQL Editor, run the complete file `supabase/schema.sql` from this repository.
3. Open **Authentication → Users** and create your owner account using your email. Do not enable a public registration flow for the store manager.
4. Copy the new user's UUID from the Users screen.
5. In SQL Editor, run this statement after replacing the example UUID with your own user UUID:
   ```sql
   insert into public.store_admins (user_id)
   values ('REPLACE-WITH-YOUR-OWNER-USER-UUID');
   ```
   This allowlist is the actual authorization control. A signed-in user not listed in `store_admins` cannot manage products. Do not add customers to this table.

## 2. Add the browser-safe project configuration
1. In Supabase, open **Project Settings → API** (the API keys area).
2. Copy the **Project URL** and the **publishable key** (older projects may call this the `anon` key).
3. Edit `supabase-config.js` in the repository and fill in `projectUrl` and `publishableKey`.
4. The publishable/anon key is expected to be visible in browser code. The database and storage RLS policies protect access. **Never paste a service-role key, secret key, database password, or private credential into this file.**
5. Commit and publish the updated static site. The same configuration is used by the public catalog loader and the owner manager.

## 3. Configure the Auth URL allowlist
In Supabase **Authentication → URL Configuration**, set the production Site URL to your actual GitHub Pages URL and add that URL to the Redirect URLs allowlist. The exact URL depends on your GitHub Pages configuration; check the repository's **Settings → Pages** and use the URL shown there. If you use a custom domain later, add it too.

## 4. Open the manager
Visit `admin.html` on your published site. Sign in with the owner email/password created in Supabase. There is deliberately no sign-up form on this public page. If the account is not allowlisted, it is denied access.

## What you can manage
- Create and edit products, prices, descriptions, image, collection, color, tags, availability and publish status.
- Upload JPG, PNG, or WebP product images (maximum 8 MB) to the managed `product-images` bucket.
- Drag product cards to reorder them.
- Save products as drafts and publish only when their details and photo are ready.
- Existing product and category pages load published products from Supabase once the project configuration is completed.

## Important limits and safety
- Until the Supabase project, SQL policies, owner allowlist, config and Pages deployment are complete, authentication and editing are **not live**. An unconfigured manager displays a setup message instead of pretending to sign in.
- This first phase is an owner product manager, not a full page builder, customer account system, inventory/order system, or payment integration.
- A published product is displayed in the catalog; a working purchase still requires a verified hosted payment URL and tested checkout flow. Never collect card details directly in the static site.
- The Supabase publishable/anon key is not a secret. Keep RLS enabled and never expose the service-role/secret key.
- Product image URLs are public because they appear on the public storefront. Only allowlisted admins may upload, replace or delete files through the bucket policies.
- GitHub Pages hosts static files and cannot run server-side code. Authentication and authorization are provided by Supabase, with authorization enforced by database policies rather than by hiding the admin page.

## Troubleshooting
- **“One little setup step first”**: check `supabase-config.js`, confirm the config is saved to the deployed branch, and verify the Supabase project URL/key.
- **Sign-in works but access is denied**: verify that the logged-in user's UUID has a row in `public.store_admins`.
- **Products do not appear publicly**: check `published`, ensure the SQL ran without errors, and inspect the browser console/network panel for Supabase errors.
- **Photo upload fails**: verify the bucket and storage policies from `supabase/schema.sql`, file type, and 8 MB size limit.
