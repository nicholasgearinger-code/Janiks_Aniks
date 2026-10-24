/* Shared, hand-maintained product data for Janiks Aniks.
   Only publish a product after its exact product photo, name, description, price,
   category, and availability have been confirmed by the shop owner.
   Do not place payment secrets here. paymentUrl must be a verified HTTPS hosted checkout URL.
   GitHub Pages is static hosting: never add private API keys or card-processing code here. */
window.JANIKS_PRODUCTS = [
  /* Add confirmed products using this shape:
  {
    slug: "unique-product-slug",
    name: "Confirmed product name",
    description: "Confirmed description and care details.",
    price: 0,
    image: "images/products/exact-product-photo.webp",
    category: "mugs",
    color: "pink",
    tags: [],
    available: true,
    paymentUrl: ""
  }
  */
];
window.JANIKS_PRODUCTS_BY_SLUG = Object.fromEntries(
  window.JANIKS_PRODUCTS.map(function (product) {
    return [product.slug, product];
  })
);
