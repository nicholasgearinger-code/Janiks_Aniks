# Janiks Aniks shop catalog setup

The site now has a reusable category page (category.html) and product detail template (product.html). They intentionally show a coming-soon state until actual products have been photographed and entered. No prices, inventory, or payment URLs have been invented.

## Add product photography
- Create an images/products/ folder.
- Use one clear front or three-quarter photo per product, then add detail and scale photos as useful.
- Use descriptive filenames, e.g. pink-bow-mug-front.webp.
- Keep photos bright, consistent, and cropped similarly; use your own photos of the exact item sold.

## Add a product to the catalog
In category.html, the products array inside the page script is currently empty. Add records with slug (unique URL-safe ID), name, description, price (numeric PHP price), image (photo path), category (mugs, plushies, or accessories), and optional color (pink, yellow, green, white, redorange, or colorpop). Add the same product under the products object in product.html, keyed by the same slug, and include a verified paymentUrl only after configuring and testing checkout.

## Suggested photo checklist
1. Main product photo on a simple background.
2. Alternate angle / handle / character detail.
3. Size reference or mug capacity / plushie dimensions.
4. Packaging or gift-ready photo if applicable.

## Important
This is a static website: a shared cart across devices, inventory synchronization, order management, shipping calculation and secure checkout require an ecommerce or payment integration. Do not collect card details directly in these HTML files.
