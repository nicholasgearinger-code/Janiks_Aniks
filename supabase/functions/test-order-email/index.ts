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
 const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({
 from:'Janiks Aniks Test <onboarding@resend.dev>',to:[email],
 subject:'Janiks Aniks ♡ Test order confirmation (not a real purchase)',
 text:'Janiks Aniks — TEST EMAIL ONLY\n\nYour email integration is working! This is a sample order confirmation, not a purchase, invoice, or payment receipt.\n\nCute things, happy days ♡'
 })});
 const payload=await result.json().catch(()=>({}));
 if(!result.ok){console.error('Resend test failed',result.status,payload);return json({error:'Resend could not send the test email. Check your verified Resend email and API key.'},502);}
 return json({sent:true,id:typeof payload.id==='string'?payload.id:null,message:'Resend accepted the test email request. Delivery to the inbox is not yet confirmed.'});
});
