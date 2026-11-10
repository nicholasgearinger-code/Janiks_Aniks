# Reusable Janiks Aniks product page

Every published product uses the same live template at `product.html?slug=PRODUCT-SLUG`.

## Editing a product — no code changes
1. Sign in to your Store Manager and open **Products**.
2. Create a product or edit an existing one.
3. Update its **name, category, price, description, and main photo**. Set availability/stock as appropriate.
4. When the listing is complete and ready to appear publicly, choose **Published** and save it.
5. Open its product page from the storefront. Its name, image, description, price, category label, cart action, and related products are filled automatically from Supabase.

**Safety:** Draft, out-of-stock, incomplete or unavailable products don't become purchasable. The GCash/pickup notice does not mean checkout or automatic payment processing is enabled. Existing checkout settings and manual verification remain unchanged.

## What stays the same for every listing
- Site navigation, mobile layout, page colors, and header
- Quantity controls (1–99), Add to Cart, and account-based Save to Favorites
- GCash/payment verification/store pickup notice
- Optional related products from the same published category (up to two)
- Existing privacy-conscious visitor and referral counters

## Photos
The existing Store Manager has one main photo field per product. The template intentionally **hides the thumbnail strip if there are no other photos**. It does not show fake product photos.

The shared template can render an optional array of extra image URLs via `product.images` when future catalog management supports it. Multiple-photo upload/management is **not yet implemented** in Store Manager; it would require a follow-on feature.

## Reviews and SEO
The page intentionally hides the ratings row unless real product-specific rating/count data is available. Sitewide reviews are not misrepresented as product reviews.

The generic `product.html` route is currently set to `noindex,follow` so a JavaScript-rendered generic title cannot be indexed as hundreds of duplicate pages. If individual product SEO is desired, implement crawlable per-product URLs, unique static/SSR metadata and product JSON-LD before removing `noindex`.

## Main source files
- `product.html` — shared semantic layout and original navigation
- `product-page.js` — gallery, quantity +/− controls, related products
- `styles.css` — responsive template theme
- `store.js` — original cart and live catalog rendering
- `customer-favorites.js` — original account wishlist actions, integrated into template
- `catalog.js` — loads the actual published products from Supabase
