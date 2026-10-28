// Deploy with Supabase JWT verification ENABLED.
// Owner-only production order email sender. No client-provided recipient or prices.
import {createClient} from 'npm:@supabase/supabase-js@2';
import {orderReceivedEmail} from '../_shared/order-email.ts';
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
