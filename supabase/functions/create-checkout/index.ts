import { createClient } from 'npm:@supabase/supabase-js@2';
const origin='https://nicholasgearinger-code.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
function reply(body,status=200){return new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}})}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(Deno.env.get('PAYMONGO_CHECKOUT_ENABLED')!=='true')return reply({error:'Payments are not activated yet.'},503);
 const secret=Deno.env.get('PAYMONGO_SECRET_KEY');
 if(!secret)return reply({error:'Checkout is not configured yet.'},503);
 try{
  const body=await req.json(),items=body.items;
  if(!Array.isArray(items)||items.length<1||items.length>30)return reply({error:'Invalid bag'},400);
  const email=String(body.email||'').trim(),name=String(body.name||'').trim(),phone=String(body.phone||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2||name.length>120||phone.length>40)return reply({error:'Enter valid contact details'},400);
  const unique=new Set();for(const item of items){if(!item||typeof item.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99||unique.has(item.slug))return reply({error:'Invalid bag items'},400);unique.add(item.slug);}
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const {data:products,error:dbError}=await admin.from('products').select('id,slug,name,price,available,published').in('slug',[...unique]);
  if(dbError)throw dbError;
  const bySlug=new Map((products||[]).map(p=>[p.slug,p]));
  let subtotal=0;const lines=[];
  for(const item of items){const p=bySlug.get(item.slug);if(!p||!p.published||!p.available||Number(p.price)<=0)return reply({error:'A product is no longer available'},409);
   const cents=Math.round(Number(p.price)*100);if(!Number.isSafeInteger(cents)||cents<100)return reply({error:'Invalid catalog price'},409);
   subtotal+=cents*item.quantity;lines.push({product_id:p.id,product_name:p.name,quantity:item.quantity,unit_price:cents/100,line_total:cents*item.quantity/100,paymongo:{name:p.name,amount:cents,currency:'PHP',quantity:item.quantity}});}
  if(!Number.isSafeInteger(subtotal)||subtotal>100000000)return reply({error:'Order total exceeds limit'},400);
  // Shipping is not configured; do not charge or promise delivery.
  // This integration currently supports pickup only, without an invented delivery fee.
  if(body.fulfillment!=='pickup')return reply({error:'Delivery checkout is not configured yet'},400);
  const orderNumber='JA-'+crypto.randomUUID();
  const {data:order,error:insertError}=await admin.from('orders').insert({order_number:orderNumber,customer_name:name,customer_email:email,customer_phone:phone,shipping_method:'pickup',shipping_fee:0,subtotal:subtotal/100,total:subtotal/100,payment_status:'unpaid',payment_provider:'paymongo'}).select('id').single();
  if(insertError)throw insertError;
  const {error:itemError}=await admin.from('order_items').insert(lines.map(({paymongo,...line})=>({...line,order_id:order.id})));
  if(itemError)throw itemError;
  const auth='Basic '+btoa(secret+':');
  const payment=await fetch('https://api.paymongo.com/v2/checkout_sessions',{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({data:{attributes:{line_items:lines.map(x=>x.paymongo),payment_method_types:['gcash','qrph','card'],success_url:'https://nicholasgearinger-code.github.io/Janiks_Aniks/checkout-result.html?status=returned',cancel_url:'https://nicholasgearinger-code.github.io/Janiks_Aniks/cart.html',reference_number:orderNumber,description:'Janiks Aniks order '+orderNumber}}})});
  const result=await payment.json();
  if(!payment.ok||!result?.data?.attributes?.checkout_url)return reply({error:'Payment session could not be created. Please try again.'},502);
  const url=result.data.attributes.checkout_url;
  if(!/^https:\/\/checkout\.paymongo\.com\//.test(url))return reply({error:'Unexpected payment destination'},502);
  await admin.from('orders').update({payment_status:'pending',provider_reference:result.data.id}).eq('id',order.id);
  return reply({checkout_url:url,order_number:orderNumber});
 }catch(e){console.error('Checkout error',e);return reply({error:'Unable to start checkout'},500);}
});