# PayMongo checkout integration — staged, NOT LIVE

The new `checkout.html` review form and `supabase/functions/create-checkout/index.ts` Edge Function are committed, but **payment processing is deliberately disabled**. The public `supabase-config.js` contains `checkoutEnabled:false`, and the Edge Function separately requires secret `PAYMONGO_CHECKOUT_ENABLED=true`. Do **not** enable either switch until every prerequisite below is satisfied.

1. Create a PayMongo merchant account at https://dashboard.paymongo.com/ and complete business verification. Check merchant eligibility and available GCash/QRPh/card methods.
2. Obtain **test** API credentials. Set `PAYMONGO_SECRET_KEY` as a **Supabase Edge Function secret**; never place it in GitHub, browser JS, SQL migrations, or chat. Deploy `create-checkout` with JWT verification disabled **only** after adding proper abuse/rate limiting and webhook support, since this first iteration supports guest checkout. Protect production against order/session spam.
3. Configure a separate PayMongo webhook endpoint for `checkout_session.payment.paid`. Verify the `Paymongo-Signature` HMAC SHA-256 against the **raw** request body using the webhook secret, check timestamp and live/test mode, and process each event idempotently. Match provider session ID, reference, currency and amount to the server-created order before marking it paid. Never use the success redirect as proof of payment.
4. Add checkout database hardening: a payment event audit table, idempotency and atomic order+item creation, order-to-user ownership for signed-in customers, shipping methods/rates, pickup policy, inventory reservation, tax/fee handling and cancellation/expiry behavior.
5. Test success, cancel, duplicate webhook, invalid signature, altered price, unavailable products, two devices and retry failures in PayMongo test mode. Only after review and verified live merchant readiness set the server-side and client-side enable flags. **Do not enable checkout merely by changing the client flag.**

The current server scaffold always recalculates PHP prices from published Supabase products, rejects unavailable items, supports up to 30 lines and only the pickup fulfillment value, and never receives payment credentials. It does not calculate shipping and does not support delivery. It writes unpaid/pending orders before creating the hosted payment session, but does **not** yet implement a webhook, inventory controls, transactional emails, or customer order history. Do not deploy this scaffold as a live payment system.

Official references:
- https://docs.paymongo.com/docs/payment-channels-hosted-checkout
- https://docs.paymongo.com/docs/developer-tools-webhook-setup-management
- https://supabase.com/docs/guides/functions/secrets
