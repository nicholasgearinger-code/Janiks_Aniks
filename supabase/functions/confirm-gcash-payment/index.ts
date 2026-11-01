import { createClient } from 'npm:@supabase/supabase-js@2';
const headers={'Access-Control-Allow-Origin':'https://janiksaniks.com','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{...headers,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),pub=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!pub||!service)return json({error:'Server not configured'},503);
 const bearer=req.headers.get('Authorization')||'';
 const userClient=createClient(url,pub,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await userClient.auth.getUser(bearer.replace(/^Bearer\s+/i,''));
 if(authError||!user)return json({error:'Sign in required'},401);
 const admin=createClient(url,service,{auth:{persistSession:false}});
 const allowed=await admin.from('store_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(allowed.error||!allowed.data)return json({error:'Owner access required'},403);
 let orderId;
 try {const body=await req.json();orderId=String(body.order_id||'');if(!/^[a-f0-9-]{36}$/i.test(orderId))throw Error('bad id');}
 catch{return json({error:'Invalid order ID'},400);}
 const {data:order,error}=await admin.from('orders').select('id,order_number,payment_status,payment_provider,fulfillment_status,total').eq('id',orderId).single();
 if(error||!order)return json({error:'Order not found'},404);
 if(order.payment_provider!=='gcash_manual')return json({error:'Not a manual GCash order'},409);
 if(order.payment_status==='paid')return json({status:'already_paid',order_number:order.order_number});
 if(!['pending','unpaid'].includes(order.payment_status)||order.fulfillment_status==='cancelled')return json({error:'Order cannot be confirmed'},409);
 const updated=await admin.from('orders').update({payment_status:'paid',fulfillment_status:'confirmed'})
   .eq('id',orderId).in('payment_status',['pending','unpaid']).eq('payment_provider','gcash_manual').neq('fulfillment_status','cancelled').select('id').maybeSingle();
 if(updated.error)return json({error:'Unable to confirm payment'},500);
 if(!updated.data)return json({error:'Order changed; refresh'},409);
 return json({status:'confirmed',order_number:order.order_number});
});
