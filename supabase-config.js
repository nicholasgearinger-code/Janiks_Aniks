/* Public browser configuration only. Never put a service-role/secret key here. */
window.JANIKS_SUPABASE_CONFIG = {
  projectUrl: "https://cjexvxqpmsumgizulpym.supabase.co",
  publishableKey: "sb_publishable_qAJrNpvkgLmtZMDwMzvQVQ_XEEsUlFO",
  checkoutEnabled: false, // Legacy PayMongo checkout remains disabled
  gcashCheckoutEnabled: false, // Set true only after Edge Functions and GCash information are tested
  gcashQrImage: '', // Public URL to the actual official GCash QR image
  gcashPaymentLink: '', // Exact verified official GCash payment link
  contactFormEnabled: true, // Enable only after contact-inquiry is deployed, verified and abuse controls checked
  turnstileSiteKey: '0x4AAAAAAFvvB9vMyxUOCRMM' // Cloudflare Turnstile PUBLIC site key for janiksaniks.com
};
