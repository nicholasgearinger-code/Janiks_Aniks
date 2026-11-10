# Reusable Janiks Aniks product page — setup and editing

Every product uses the same live layout at `product.html?slug=PRODUCT-SLUG`. No separate HTML file is required per item.

## Sample mug preview

Open `https://janiksaniks.com/product.html?preview=sample-mug`.

This is **only a design preview**, with original sample SVG illustrations and a clearly labeled example price. It is not added to Supabase, the public catalog, or the cart; **purchase and favorites buttons remain disabled**. Replace sample graphics with authentic, verified product photos when publishing real inventory.

## REQUIRED: Enable multiple photos once in Supabase

1. Open Supabase Dashboard → SQL Editor for the Janiks Aniks project.
2. Copy the SQL from `supabase/product-multi-photos.sql` and run it.
3. The command adds `public.products.image_urls`, an optional `text[]` column holding **up to five additional image URLs**. It preserves the existing `image_url` main photo, product records, user accounts, cart, orders, and permissions.
4. Then refresh Store Manager and open **Products → Edit**. The new **Additional product photos** section is available.
5. If a save reports that `image_urls` does not exist, the migration has not been run successfully; do not keep retrying uploads until the column exists.

## Create or edit a real product

1. Go to Store Manager → Products → Add/Edit.
2. Enter product name, category, price, description, stock/availability, and **main product photo**.
3. In **Additional product photos**, select up to five JPG/PNG/WebP files (8 MB max each) or add HTTPS image URLs. Use ↑ and ↓ to change their order, × to remove them.
4. Save the listing as a **Draft** while photos/pricing are being checked. Publish only when ready for customers.
5. Product thumbnails appear automatically when additional photos exist. Clicking a thumbnail changes the large photo. One-photo products remain clean with no unused thumbnail strip.
6. The main photo stays the cover photo for product listings and cart previews. Edit the main photo field to replace it.

## Shared behavior

- Responsive pink/cream product template, existing site navigation, 1–99 quantity controls
- Existing cart sync and account favorites
- Existing GCash/manual payment verification and store-pickup-only workflow, **no checkout enablement**
- Two automatically selected related published products from the same category, when available
- Optional product-specific ratings only when actual ratings exist
- Previously deployed visitor analytics and referral tracking are unaffected

## Technical notes

- `product.html`: shared layout; `product-page.js`: photo gallery and recommendations
- `admin.html` and `admin.js`: photo uploads/reorder/remove and form validation
- `catalog.js`: fetches `image_urls` with a backward-compatible fallback if migration is missing
- `supabase/product-multi-photos.sql`: additive database change
- `styles.css`, `admin.css`: responsive styling
- Product pages currently remain `noindex,follow`; add unique crawlable product URLs and metadata before changing that.
- Uploaded files are stored in the existing `product-images` Supabase Storage bucket. Removing a thumbnail from a product removes its URL from the listing, **not** the underlying object in Storage.
