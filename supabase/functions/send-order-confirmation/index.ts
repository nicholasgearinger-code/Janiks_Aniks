import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': 'https://janiksaniks.com',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' } as Record<string,string>)[c]);
const pesos = (value: unknown) => '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resend = Deno.env.get('RESEND_API_KEY');
  if (!url || !anon || !service || !resend) return reply({ error: 'Server is not configured' }, 503);
  const bearer = req.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(bearer)) return reply({ error: 'Sign in required' }, 401);
  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error: authError } = await authClient.auth.getUser(bearer.replace(/^Bearer\s+/i, ''));
  if (authError || !identity.user) return reply({ error: 'Unauthorized' }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: allowed, error: accessError } = await admin.from('store_admins').select('user_id').eq('user_id', identity.user.id).maybeSingle();
  if (accessError || !allowed) return reply({ error: 'Owner access required' }, 403);
  let id: string;
  try {
    const body = await req.json();
    id = String(body.order_id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw Error('bad id');
  } catch { return reply({ error: 'Invalid order ID' }, 400); }
  const { data: order, error: orderError } = await admin.from('orders')
    .select('id,order_number,customer_name,customer_email,subtotal,shipping_fee,total,currency,shipping_method,fulfillment_status')
    .eq('id', id).single();
  if (orderError || !order) return reply({ error: 'Order not found' }, 404);
  if (order.fulfillment_status !== 'confirmed') return reply({ error: 'Confirm this order in Store Manager before sending email' }, 409);
  const { data: items, error: itemsError } = await admin.from('order_items')
    .select('product_name,quantity,unit_price,line_total').eq('order_id', id);
  if (itemsError || !items?.length) return reply({ error: 'Order items not found' }, 409);
  const { data: claimed, error: claimError } = await admin.rpc('claim_order_confirmation', { p_order_id: id });
  if (claimError) { console.error('Claim error', claimError); return reply({ error: 'Email tracking not configured' }, 503); }
  if (!claimed) return reply({ status: 'already_claimed', message: 'Confirmation already sent or being processed; no duplicate sent' });
  const rows = items.map(item => `<tr><td style="padding:10px;border-bottom:1px solid #f2dfe7">${esc(item.product_name)} × ${Number(item.quantity)}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #f2dfe7">${esc(pesos(item.line_total))}</td></tr>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#fff7fb;font-family:Arial,sans-serif;color:#28354a"><div style="max-width:560px;margin:auto;padding:32px 20px"><h1 style="color:#b24979;text-align:center">Janiks Aniks ♡</h1><div style="background:white;border-radius:18px;padding:28px"><h2>Your order is confirmed!</h2><p>Hi ${esc(order.customer_name)}, thank you for shopping with us! Your order <strong>${esc(order.order_number)}</strong> has been confirmed.</p><table style="border-collapse:collapse;width:100%">${rows}<tr><td style="padding:12px 10px"><strong>Total</strong></td><td style="padding:12px 10px;text-align:right"><strong>${esc(pesos(order.total))}</strong></td></tr></table><p>Fulfillment: ${esc(order.shipping_method || 'To be arranged')}</p><p>Made with love ♡</p></div><p style="text-align:center;font-size:12px">Janiks Aniks · <a href="https://janiksaniks.com">janiksaniks.com</a></p></div></body></html>`;
  try {
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resend}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `janiks-order-confirmation-${id}`,
      },
      body: JSON.stringify({
        from: 'Janiks Aniks <orders@janiksaniks.com>',
        to: [order.customer_email],
        subject: `Your Janiks Aniks order ${order.order_number} is confirmed ♡`,
        html,
      }),
    });
    const output = await result.json().catch(() => ({}));
    if (!result.ok || !output.id) throw Error(`Resend HTTP ${result.status}`);
    const { error: markError } = await admin.from('order_confirmation_emails')
      .update({ state: 'sent', resend_email_id: output.id, sent_at: new Date().toISOString(), last_error: null }).eq('order_id', id);
    if (markError) console.error('Email accepted, but status update failed', markError);
    return reply({ status: 'sent', email_id: output.id });
  } catch (error) {
    console.error('Email send failed', error);
    await admin.from('order_confirmation_emails').update({state:'failed', last_error: String(error).slice(0,400)}).eq('order_id',id);
    // No automatic retry: prevents duplicates when delivery acceptance is uncertain.
    return reply({ error: 'Sending failed or could not be confirmed; review Resend logs before retrying' }, 502);
  }
});
