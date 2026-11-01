# GCash manual checkout setup — staged, NOT live

This replaces PayMongo with a customer-authenticated, server-priced order submission and manually verified GCash payment workflow. Live checkout is deliberately disabled until merchant payment instructions are verified.

## Backend functions

Deploy these two functions via Supabase Edge Functions, using the matching full code from this repository:

- `create-gcash-order` from `supabase/functions/create-gcash-order/index.ts`
- `confirm-gcash-payment` from `supabase/functions/confirm-gcash-payment/index.ts`

Keep JWT verification **enabled** for both. Both functions require authenticated users: creation requires a signed-in customer; confirmation requires a signed-in allowlisted store administrator. The existing `send-order-confirmation` function is separately deployed. Confirm that it has the correct code and `RESEND_API_KEY` configured.

Supabase secret `GCASH_ORDERS_ENABLED=true` activates the backend order creation endpoint only after testing. No GCash credentials belong in the frontend, repo, or database. Keep the legacy `PAYMONGO_CHECKOUT_ENABLED` unset or false.

## Payment details

Upload the actual official GCash QR image to your site (for example `images/gcash-payment-qr.png`). Ensure the QR belongs to your intended receiving account and displays the correct payee. Confirm that the GCash payment link is a genuine accepted payment URL.

Set these public fields in `supabase-config.js`:

- `gcashQrImage: 'images/gcash-payment-qr.png'`
- `gcashPaymentLink: 'https://ACTUAL-VERIFIED-GCASH-LINK'`
- `gcashCheckoutEnabled: true` only after testing all prerequisites.

Do **not** publish payment instructions based on guessed URLs or QR codes. Display of a QR code or opening a link does not verify payment.

## Flow

1. Customer signs into their Janiks Aniks account and submits a cart.
2. `create-gcash-order` validates the bag, recalculates prices from Supabase products, writes a pending GCash order and items, and returns the number and total.
3. Checkout displays the official QR and link; customers choose ONE payment method.
4. Owner independently checks the incoming GCash transaction **in their GCash account** (amount, recipient and reference) before pressing `I verified payment in GCash — confirm & email` in Order Studio.
5. The owner-only `confirm-gcash-payment` endpoint sets paid/confirmed. The Store Manager then invokes `send-order-confirmation`, which uses the existing email claim table to avoid duplicate messages.

## Safety and launch checks

- Delivery/shipping is not offered yet; pickup only, pending store arrangements.
- No automatic verification of GCash transfer is implemented. Never treat customer-submitted receipts or claims as authoritative.
- Keep checkout disabled until rate limiting/abuse controls, payment reconciliation, inventory concurrency, and email failure recovery are reviewed for production.
- Test signed-out order rejection, tampered prices, unavailable products, repeat submissions, invalid/unauthorized payment confirmations, duplicate email requests, errors between order creation and line-item insertion, and mobile checkout.
- Current order creation consists of sequential writes, not a DB transaction; build an atomic database RPC before broad release to avoid partial or orphaned orders.
- An email failure after a successful payment update requires manual review in Supabase and Resend logs; do not mark payment unpaid to retry email.
- The configured `send-order-confirmation` function does not automatically send without the authenticated Store Manager action.

## Testing

Confirm new functions are deployed, then test using a signed-in customer account and a safe controlled test order. Check Supabase function invocations and Resend logs. Only consider checkout ready after verifying the email reaches the intended recipient and the actual payment was confirmed independently.
