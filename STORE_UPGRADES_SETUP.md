# Store Manager inventory and customer address setup

Run these migrations in the Supabase SQL Editor **after** the existing schema and customer/order migrations:
1. `supabase/inventory.sql` — adds nullable product stock, low-stock thresholds, a restricted audited stock adjustment RPC, and owner-only history.
2. `supabase/customer-addresses.sql` — adds owner-only saved delivery addresses with RLS for each signed-in customer.

Then sign in to `admin.html` using your allowlisted owner account, open **Inventory**, and set stock quantities with a reason. The migration preserves every existing product and leaves its stock untracked until you enter an actual quantity. The **Orders** tab remains available for reviewing recorded orders and fulfillment.

Sign in to `account.html` as a customer to save and remove addresses. Addresses are private to that customer; they are not automatically used for checkout and do not calculate shipping costs.

**Important safety limitations:** Payments remain disabled; inventory is not automatically reserved or deducted on orders, and no delivery fees, courier rates, notification emails, or customer-facing order history are live. Do not turn on live checkout until payment verification, stock reservation, shipping prices, and email delivery have been implemented and tested. The repository commits do not execute SQL migrations or verify your Supabase deployment.
