# Janiks Aniks — SEO rollout (November 2026)

## Already committed
- Updated unique title tags and descriptions across 12 public storefront, collection, store, payment, contact and review pages.
- One canonical, one OG title/description/image, and consistent social preview metadata per public page.
- BreadcrumbList JSON-LD on the 11 public secondary pages, and matching Store JSON-LD on Home and Visit Us.
- Existing public sitemap and robots.txt remain intact. Private account, cart, admin and checkout pages are not placed in the sitemap.
- No fake review stars, opening hours, phone numbers, delivery promises, or product availability are added.

## Critical product SEO limitation
The shared `product.html?slug=...` and generic `category.html` templates remain `noindex,follow`. Product content is fetched client-side from Supabase, and unverified draft listings must not be indexed. A crawler-safe rollout requires:
1. Produce dedicated, stable, pre-rendered HTML product URLs for **published, verified** products only, with item-specific title, meta description, canonical, OG product image and visible product content in the original HTML.
2. Generate Product/Offer JSON-LD from accurate price, PHP currency and real availability; never include fabricated reviews or unsupported shipping promises. Reflect store pickup and payment constraints accurately.
3. Build those files and a **product sitemap** whenever published catalog data changes, then link product cards to these unique URLs while preserving existing cart and customer-account behavior.
4. Remove `noindex` only on completed, validated product URLs. Keep generic templates, invalid slugs and sample previews noindexed.
5. If a build uses Supabase, read only publicly published catalog rows with authorized read-only credentials; never embed the service-role key in public HTML or a public script.

## Follow-up actions outside GitHub
1. Verify domain ownership in [Google Search Console](https://search.google.com/search-console).
2. Submit `https://janiksaniks.com/sitemap.xml` in Search Console.
3. Inspect the homepage and several category URLs using **URL Inspection → Test Live URL**.
4. Test structured data with [Rich Results Test](https://search.google.com/test/rich-results) and [Schema Markup Validator](https://validator.schema.org/).
5. Confirm real store location, business profile eligibility, published opening hours and phone number before adding any unverified local-business fields.
6. Run mobile PageSpeed Insights, and monitor indexing, queries, CTR and Core Web Vitals over time. Ranking and rich-result display are not guaranteed.

## Notes
The current sitemap correctly lists canonical public static pages. It intentionally excludes private pages and dynamic products. No live crawl or Search Console ownership verification is claimed by these repository changes. Keep public URL previews and SEO metadata up to date as product categories evolve.
