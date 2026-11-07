import { createClient } from 'npm:@supabase/supabase-js@2';
const origin='https://janiksaniks.com';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{...headers,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),pub=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!pub||!service)return json({error:'Server not configured'},503);
 if(Deno.env.get('GCASH_ORDERS_ENABLED')!=='true')return json({error:'GCash checkout has not been activated'},503);
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
 const auth=createClient(url,pub,{auth:{persistSession:false}});
 const u=await auth.auth.getUser(token);
 if(u.error||!u.data.user?.email)return json({error:'Sign in to place an order'},401);
 const admin=createClient(url,service,{auth:{persistSession:false}});
 try {
  const payload=await req.json();
  if(!Array.isArray(payload.items)||!payload.items.length||payload.items.length>30)return json({error:'Invalid bag'},400);
  const name=String(payload.name||'').trim(),phone=String(payload.phone||'').trim();
  if(name.length<2||name.length>120||phone.length>40||payload.fulfillment!=='pickup')return json({error:'Invalid contact or pickup selection'},400);
  const unique=new Set<string>();
  for(const item of payload.items){
   if(typeof item?.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20||unique.has(item.slug))return json({error:'Invalid bag items'},400);
   unique.add(item.slug);
  }
  const {data:products,error:productError}=await admin.from('products').select('id,slug,name,price,published,available,stock_quantity').in('slug',[...unique]);
  if(productError)throw productError;
  const map=new Map((products||[]).map(p=>[p.slug,p]));
  let totalCents=0;
  const lines=[];
  for(const item of payload.items){
   const p=map.get(item.slug);
   if(!p||!p.published||!p.available||!(Number(p.price)>0)||p.stock_quantity!==null&&item.quantity>Number(p.stock_quantity))return json({error:'An item is unavailable or out of stock'},409);
   const cents=Math.round(Number(p.price)*100);
   if(!Number.isSafeInteger(cents)||cents<1)return json({error:'Invalid catalog price'},409);
   totalCents+=cents*item.quantity;
   lines.push({product_id:p.id,product_name:p.name,quantity:item.quantity,unit_price:cents/100,line_total:cents*item.quantity/100});
  }
  if(!Number.isSafeInteger(totalCents)||totalCents>100000000)return json({error:'Order total exceeds limit'},400);
  const orderNumber='JA-'+crypto.randomUUID();
  const {data:order,error:orderError}=await admin.from('orders').insert({
   order_number:orderNumber,customer_user_id:u.data.user.id,customer_name:name,customer_email:u.data.user.email,
   customer_phone:phone,shipping_method:'pickup',shipping_fee:0,subtotal:totalCents/100,total:totalCents/100,
   payment_status:'pending',payment_provider:'gcash_manual',fulfillment_status:'pending'
  }).select('id').single();
  if(orderError)throw orderError;
  const {error:itemError}=await admin.from('order_items').insert(lines.map(line=>({...line,order_id:order.id})));
  if(itemError){await admin.from('orders').delete().eq('id',order.id);throw itemError;}
  return json({order_number:orderNumber,total:totalCents/100,currency:'PHP',status:'awaiting_manual_payment'});
 }catch(e){console.error('GCash order creation failed',e);return json({error:'Could not submit order'},500);}
});
