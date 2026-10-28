// Deploy with Supabase JWT verification ENABLED.
// Owner-only production order email sender. No client-provided recipient or prices.
import {createClient} from 'npm:@supabase/supabase-js@2';
// Reusable, server-side Janiks Aniks transactional email renderer.
// Never accept prices or customer email addresses from browser input.
type OrderLine={product_name:string;quantity:number;line_total:number};
type OrderInfo={order_number:string;customer_name:string;subtotal:number;shipping_fee:number;total:number;payment_status:string;shipping_method:string};
const logo='https://nicholasgearinger-code.github.io/Janiks_Aniks/images/janiks-aniks-logo-horizontal-notag.png';
const shop='https://nicholasgearinger-code.github.io/Janiks_Aniks/';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const peso=(v:number)=>'₱'+Number(v).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
function orderReceivedEmail(order:OrderInfo,items:OrderLine[]){
 const name=esc(order.customer_name),number=esc(order.order_number);
 const rows=items.map(i=>`<tr><td style="padding:16px 8px 16px 0;border-bottom:1px solid #f5e2e6"><strong style="font-size:15px">${esc(i.product_name)}</strong><div style="font:12px Arial,sans-serif;color:#996e79;margin-top:5px">Quantity: ${i.quantity}</div></td><td align="right" style="padding:16px 0;border-bottom:1px solid #f5e2e6;font:bold 14px Arial,sans-serif;white-space:nowrap">${peso(i.line_total)}</td></tr>`).join('');
 const payment=order.payment_status==='paid'?'Payment received':order.payment_status==='pending'?'Payment verification pending':'Payment not yet confirmed';
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f9edf0;font-family:Georgia,serif;color:#612b39">
 <div style="display:none;max-height:0;overflow:hidden;opacity:0">Your Janiks Aniks order ${number} has been received.</div>
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9edf0"><tr><td align="center" style="padding:22px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:510px;background:#fffdfb;border:1px solid #efcbd2;border-radius:18px;overflow:hidden">
 <tr><td align="center" style="background:#fbe5eb;padding:25px 18px 23px"><img src="${logo}" width="330" alt="Janiks Aniks" style="display:block;width:100%;max-width:330px;height:auto;border:0"><p style="font:11px Arial,sans-serif;letter-spacing:2.5px;color:#9e3048;margin:12px 0 0">CUTE THINGS, HAPPY DAYS ♡</p></td></tr>
 <tr><td align="center" style="padding:30px 22px 18px"><div style="font-size:36px">🎀</div><h1 style="font-size:28px;margin:9px 0 11px">Your order is in!</h1><p style="font:13px/1.7 Arial,sans-serif;color:#92616e;margin:0">Thank you for shopping with us, ${name}!<br>We're so excited to prepare your little bundle of happiness.</p></td></tr>
 <tr><td style="padding:4px 23px 22px"><table role="presentation" width="100%" style="background:#fff1f4;border:1px dashed #e7a8b7;border-radius:12px"><tr><td align="center" style="padding:15px"><div style="font:10px Arial,sans-serif;letter-spacing:2px;color:#99546a">ORDER NUMBER</div><div style="font-size:20px;font-weight:bold;margin-top:5px">${number}</div><div style="font:11px Arial,sans-serif;color:#99546a;margin-top:5px">Order received · ${payment}</div></td></tr></table></td></tr>
 <tr><td style="padding:0 23px"><h2 style="font-size:19px;margin:0;padding-bottom:12px;border-bottom:1px solid #f2d8df">Your cute little finds ♡</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}<tr><td style="padding-top:17px;font:13px Arial,sans-serif">Subtotal</td><td align="right" style="padding-top:17px;font:13px Arial,sans-serif">${peso(order.subtotal)}</td></tr><tr><td style="padding-top:12px;font:13px Arial,sans-serif">Delivery</td><td align="right" style="padding-top:12px;font:13px Arial,sans-serif">${order.shipping_method==='pickup'?'Pickup':peso(order.shipping_fee)}</td></tr><tr><td colspan="2" style="padding-top:17px;border-bottom:1px solid #f2d8df"></td></tr><tr><td style="padding:16px 0 22px;font:bold 18px Georgia,serif">Order total</td><td align="right" style="padding:16px 0 22px;font:bold 18px Georgia,serif">${peso(order.total)}</td></tr></table></td></tr>
 <tr><td style="padding:0 23px 24px"><table role="presentation" width="100%" style="background:#fff5f6;border-radius:12px"><tr><td style="padding:18px"><strong style="font-size:17px">What's next? ♡</strong><p style="font:12px/1.8 Arial,sans-serif;color:#855665;margin:8px 0 0">We've received your order. ${order.payment_status==='paid'?'Your payment is recorded as paid. We will send another update when your order progresses.':'Your payment is not confirmed yet. We will send an update when it has been verified. Do not make an additional payment based on this email.'}</p></td></tr></table></td></tr>
 <tr><td align="center" style="padding:0 23px 28px"><a href="${shop}" style="display:inline-block;background:#9e3048;color:white;text-decoration:none;border-radius:24px;padding:13px 28px;font:bold 13px Arial,sans-serif">Visit Our Cute Little Shop ♡</a></td></tr>
 <tr><td align="center" style="background:#f9e6eb;padding:23px 18px;color:#955567"><div style="font-size:20px">🍒 ♡ 🎀</div><div style="font-size:13px;margin-top:8px">Made with love, Janiks Aniks</div><div style="font:11px Arial,sans-serif;margin-top:9px">This acknowledges your order; payment status is shown above.</div></td></tr></table></td></tr></table></body></html>`;
 const text=`Janiks Aniks — Your order is in!\n\nThank you, ${order.customer_name}!\nOrder: ${order.order_number}\nPayment: ${payment}\n\n${items.map(i=>`${i.product_name} x${i.quantity} — ${peso(i.line_total)}`).join('\n')}\nSubtotal: ${peso(order.subtotal)}\nTotal: ${peso(order.total)}\n\n${shop}`;
 return {subject:`Janiks Aniks ♡ Order received — ${order.order_number}`,html,text};
}


const origin='https://nicholasgearinger-code.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==origin)return reply({error:'Origin not allowed'},403);
 const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return reply({error:'Sign in required'},401);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),apiKey=Deno.env.get('RESEND_API_KEY'),sender=Deno.env.get('ORDER_EMAIL_FROM');
 if(!url||!anon||!service||!apiKey||!sender)return reply({error:'Production email not configured'},503);
 if(!/^.+@[^\s@]+\.[^\s@]+$/.test(sender))return reply({error:'Invalid sender configuration'},503);
 const auth=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error:userError}=await auth.auth.getUser(token);
 if(userError||!user)return reply({error:'Sign in required'},401);
 const {data:owner,error:ownerError}=await auth.from('store_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(ownerError||!owner)return reply({error:'Owner access required'},403);
 let input:unknown;try{input=await req.json()}catch{return reply({error:'Invalid JSON'},400)}
 const id=typeof input==='object'&&input!==null&&'order_id'in input?(input as {order_id:unknown}).order_id:null;
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return reply({error:'Valid order_id required'},400);
 const db=createClient(url,service,{auth:{persistSession:false}});
 const {data:order,error:orderError}=await db.from('orders').select('id,order_number,customer_name,customer_email,subtotal,shipping_fee,total,payment_status,shipping_method').eq('id',id).single();
 if(orderError||!order)return reply({error:'Order not found'},404);
 const {data:items,error:itemsError}=await db.from('order_items').select('product_name,quantity,line_total').eq('order_id',id);
 if(itemsError||!items?.length)return reply({error:'Order has no items'},409);
 // Reserve a unique delivery event before sending to prevent repeated sends on retries.
 const {error:reserveError}=await db.from('order_email_deliveries').insert({order_id:id,email_type:'order_received',recipient:order.customer_email,status:'sending'});
 if(reserveError)return reply({error:'Email already queued/sent, or delivery ledger is not installed',detail:reserveError.code},409);
 const template=orderReceivedEmail(order,items);
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({from:sender,to:[order.customer_email],subject:template.subject,html:template.html,text:template.text})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){
   await db.from('order_email_deliveries').update({status:'failed',error_message:String(result.message||'Resend rejected request').slice(0,500)}).eq('order_id',id).eq('email_type','order_received');
   return reply({error:'Email provider rejected request',provider_status:response.status},502);
  }
  await db.from('order_email_deliveries').update({status:'accepted',provider_message_id:String(result.id||'')}).eq('order_id',id).eq('email_type','order_received');
  return reply({accepted:true,message:'Resend accepted the order confirmation. Inbox delivery is not yet confirmed.'});
 }catch(e){
  await db.from('order_email_deliveries').update({status:'failed',error_message:'Network or provider error'}).eq('order_id',id).eq('email_type','order_received');
  console.error('Order email failed',e);
  return reply({error:'Email send failed'},502);
 }
});
