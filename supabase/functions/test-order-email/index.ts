// Test-only Resend email endpoint. Deploy with Supabase JWT verification ENABLED.
// Requires an authenticated, allowlisted store admin; recipient is always their own email.
import { createClient } from 'npm:@supabase/supabase-js@2';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req)=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return json({error:'Authentication required'},401);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),key=Deno.env.get('RESEND_API_KEY');
 if(!url||!anon||!key)return json({error:'Email service is not configured'},503);
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
 return json({sent:true,message:'Test email requested. Check the email address associated with your admin login.'});
});
