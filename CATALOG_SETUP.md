# Janiks Aniks shop catalog setup

The site has a reusable category page (category.html), product detail template (product.html), and one shared catalog data file (catalog.js). The pages intentionally show a coming-soon state until actual products have been photographed and entered. No prices, inventory, or payment URLs have been invented.

## Add product photography
- Create an images/products/ folder.
- Use one clear front or three-quarter photo per product, then add detail and scale photos as useful.
- Use descriptive filenames, e.g. pink-bow-mug-front.webp.
- Keep photos bright, consistent, and cropped similarly; use your own photos of the exact item sold.

## Add a product
Add a record to the JANIKS_PRODUCTS array in catalog.js with:
- slug: unique URL-safe ID, e.g. pink-bow-mug
- name: product name
- description: honest product details
- price: numeric price in PHP
- image: photo path, e.g. images/products/pink-bow-mug-front.webp
- category: mugs, plushies, or accessories
- color: optional mug color key such as pink, yellow, green, white, redorange, or colorpop
- tags: optional tags such as christmas or halloween
- paymentUrl: optional verified checkout link; leave blank until checkout is configured and tested

The category and product pages read from this shared file, so each product only needs to be entered once.

## Suggested photo checklist
1. Main product photo on a simple background.
2. Alternate angle / handle / character detail.
3. Size reference or mug capacity / plushie dimensions.
4. Packaging or gift-ready photo if applicable.

## Important
This is a static website: a shared cart across devices, inventory synchronization, order management, shipping calculation and secure checkout require an ecommerce or payment integration. Do not collect card details directly in these HTML files.
