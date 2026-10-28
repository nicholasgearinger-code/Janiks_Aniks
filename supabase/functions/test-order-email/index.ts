// Test-only Resend email endpoint. Deploy with Supabase JWT verification ENABLED.
// Requires an authenticated, allowlisted store admin; recipient is always their own email.
import { createClient } from 'npm:@supabase/supabase-js@2';
const allowedOrigin='https://nicholasgearinger-code.github.io';
const corsHeaders={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==allowedOrigin)return json({error:'Origin not allowed'},403);
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return json({error:'Authentication required'},401);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),key=Deno.env.get('RESEND_API_KEY');
 if(!url||!anon||!key){console.error('Email function missing environment variables',{SUPABASE_URL:!url,SUPABASE_ANON_KEY:!anon,RESEND_API_KEY:!key});return json({error:'Email service is not configured',missing:[!url?'SUPABASE_URL':null,!anon?'SUPABASE_ANON_KEY':null,!key?'RESEND_API_KEY':null].filter(Boolean)},503);}
 const client=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await client.auth.getUser(token);
 if(authError||!user?.email)return json({error:'Authentication required'},401);
 const {data:admin,error:adminError}=await client.from('store_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError||!admin)return json({error:'Admin access required'},403);
 // Prevent sending to other addresses or using untrusted order/customer data.
 const email=user.email;

 // All product names, prices, and order IDs below are fictional preview data.
 const logo='https://nicholasgearinger-code.github.io/Janiks_Aniks/images/janiks-aniks-logo-horizontal-notag.png';
 const shop='https://nicholasgearinger-code.github.io/Janiks_Aniks/';
 const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Janiks Aniks sample order</title></head>
 <body style="margin:0;padding:0;background:#f9edf0;font-family:Georgia,serif;color:#612b39">
 <div style="display:none;font-size:1px;color:#f9edf0;line-height:1px;max-height:0;opacity:0;overflow:hidden">TEST ONLY — A preview of your Janiks Aniks order confirmation. No purchase or payment is due.</div>
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9edf0"><tr><td align="center" style="padding:22px 12px">
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:510px;background:#fffdfb;border:1px solid #efcbd2;border-radius:18px;overflow:hidden">
 <tr><td align="center" style="background:#fbe5eb;padding:25px 18px 23px"><img src="${logo}" width="330" alt="Janiks Aniks" style="display:block;width:100%;max-width:330px;height:auto;border:0;margin:0 auto"><p style="font:11px Arial,sans-serif;letter-spacing:2.5px;color:#9e3048;margin:12px 0 0">CUTE THINGS, HAPPY DAYS ♡</p></td></tr>
 <tr><td align="center" style="padding:30px 22px 18px"><div style="font-size:36px">🎀</div><h1 style="font-size:28px;line-height:1.2;margin:9px 0 11px">Your order is in!</h1><p style="font:13px/1.7 Arial,sans-serif;color:#92616e;margin:0">Thank you for shopping with us, lovely!<br>We're so excited to prepare your little bundle of happiness.</p></td></tr>
 <tr><td style="padding:4px 23px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff1f4;border:1px dashed #e7a8b7;border-radius:12px"><tr><td align="center" style="padding:15px"><div style="font:10px Arial,sans-serif;letter-spacing:2px;color:#99546a">SAMPLE ORDER — TEST ONLY</div><div style="font-size:20px;font-weight:bold;margin-top:5px">JA-EXAMPLE-001</div><div style="font:11px Arial,sans-serif;color:#99546a;margin-top:5px">Preview only · No actual order placed</div></td></tr></table></td></tr>
 <tr><td style="padding:0 23px"><h2 style="font-size:19px;margin:0;padding-bottom:12px;border-bottom:1px solid #f2d8df">Your cute little finds ♡</h2>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #f5e2e6"><tr><td width="72" style="padding:17px 0"><div style="background:#fbe4e9;border-radius:12px;text-align:center;font-size:32px;padding:14px 0">☕</div></td><td style="padding:17px 8px 17px 12px"><strong style="font-size:15px">Cherry Bow Mug</strong><div style="font:12px Arial,sans-serif;color:#996e79;margin-top:5px">Quantity: 1</div></td><td align="right" style="font:bold 14px Arial,sans-serif;white-space:nowrap">₱350.00</td></tr></table>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #f5e2e6"><tr><td width="72" style="padding:17px 0"><div style="background:#fbe4e9;border-radius:12px;text-align:center;font-size:32px;padding:14px 0">🧸</div></td><td style="padding:17px 8px 17px 12px"><strong style="font-size:15px">Sweetheart Plushie</strong><div style="font:12px Arial,sans-serif;color:#996e79;margin-top:5px">Quantity: 1</div></td><td align="right" style="font:bold 14px Arial,sans-serif;white-space:nowrap">₱450.00</td></tr></table>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font:13px Arial,sans-serif"><tr><td style="padding-top:17px">Subtotal</td><td align="right" style="padding-top:17px">₱800.00</td></tr><tr><td style="padding-top:12px">Delivery</td><td align="right" style="padding-top:12px">To be confirmed</td></tr><tr><td colspan="2" style="padding-top:17px"><div style="border-top:1px solid #f2d8df"></div></td></tr><tr><td style="padding:16px 0 22px;font:bold 18px Georgia,serif">Sample subtotal</td><td align="right" style="padding:16px 0 22px;font:bold 18px Georgia,serif">₱800.00</td></tr></table></td></tr>
 <tr><td style="padding:0 23px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff5f6;border-radius:12px"><tr><td style="padding:18px"><strong style="font-size:17px">What's next? ♡</strong><p style="font:12px/1.8 Arial,sans-serif;color:#855665;margin:8px 0 0">This is a preview of the order confirmation email. No order has been placed, and no payment is due. When checkout is enabled, real orders will receive their own details and payment instructions.</p></td></tr></table></td></tr>
 <tr><td align="center" style="padding:0 23px 28px"><a href="${shop}" style="display:inline-block;background:#9e3048;color:#ffffff;text-decoration:none;border-radius:24px;padding:13px 28px;font:bold 13px Arial,sans-serif">Visit Our Cute Little Shop ♡</a></td></tr>
 <tr><td align="center" style="background:#f9e6eb;padding:23px 18px;color:#955567"><div style="font-size:20px">🍒 ♡ 🎀</div><div style="font-size:13px;margin-top:8px">Made with love, Janiks Aniks</div><div style="font:11px Arial,sans-serif;margin-top:9px">TEST EMAIL ONLY · Not an invoice or payment receipt</div></td></tr>
 </table></td></tr></table></body></html>`;
 const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({
 from:'Janiks Aniks Test <onboarding@resend.dev>',to:[email],
 subject:'Janiks Aniks ♡ Sample order confirmation (TEST ONLY)',
 html,
 text:'JANIKS ANIKS — TEST ONLY\\n\\nYour order is in!\\nSample order JA-EXAMPLE-001\\nCherry Bow Mug ×1 — ₱350\\nSweetheart Plushie ×1 — ₱450\\nSample subtotal ₱800\\n\\nThis is a preview. No real purchase or payment is due.\\n\\n'+shop
 })});
 const payload=await result.json().catch(()=>({}));
 if(!result.ok){console.error('Resend test failed',result.status,payload);return json({error:'Resend rejected the test email',resend_status:result.status,resend_code:typeof payload.name==='string'?payload.name:null,resend_message:typeof payload.message==='string'?payload.message:null},502);}
 return json({sent:true,id:typeof payload.id==='string'?payload.id:null,message:'Resend accepted the test email request. Delivery to the inbox is not yet confirmed.'});
});
