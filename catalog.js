/* Shared product catalog for Janiks Aniks.
   Add products here after photos, prices and stock have been confirmed.
   Never invent product details or enable checkout without a tested payment URL. */
window.JANIKS_PRODUCTS = [
  /* Example structure — replace this comment with real product objects:
  {
    slug: "pink-bow-mug",
    name: "Pink Bow Mug",
    description: "Add confirmed product details here.",
    price: 0,
    image: "images/products/pink-bow-mug-front.webp",
    category: "mugs",
    color: "pink",
    tags: [],
    paymentUrl: ""
  }
  */
];
window.JANIKS_PRODUCTS_BY_SLUG = Object.fromEntries(
  window.JANIKS_PRODUCTS.map(function (product) { return [product.slug, product]; })
);
