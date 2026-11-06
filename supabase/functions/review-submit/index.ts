import {createClient} from 'npm:@supabase/supabase-js@2';
const permitted=['https://janiksaniks.com','https://www.janiksaniks.com'];
const response=(data:unknown,status=200,origin='https://janiksaniks.com')=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':permitted.includes(origin)?origin:permitted[0],'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':permitted.includes(origin)?origin:permitted[0],'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}});
 if(req.method!=='POST')return response({error:'Method not allowed'},405,origin);
 if(!permitted.includes(origin))return response({error:'Origin not allowed'},403,origin);
 try{
  if(Number(req.headers.get('content-length')||0)>6000)return response({error:'Submission too large'},413,origin);
  const raw=await req.text();if(raw.length>6000)return response({error:'Submission too large'},413,origin);
  const data=JSON.parse(raw);
  const name=String(data.name||'').trim(),body=String(data.body||'').trim(),rating=Number(data.rating),token=String(data.turnstileToken||'');
  if(name.length<2||name.length>60||body.length<15||body.length>1200||!Number.isInteger(rating)||rating<1||rating>5||token.length<10)return response({error:'Please complete your name, rating, review and verification.'},400,origin);
  const secret=Deno.env.get('TURNSTILE_SECRET_KEY'),url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!secret||!url||!key)return response({error:'Review service is not configured'},503,origin);
  const form=new FormData();form.set('secret',secret);form.set('response',token);
  const v=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});
  const verified=await v.json();
  if(!verified.success||!['janiksaniks.com','www.janiksaniks.com'].includes(verified.hostname))return response({error:'Security verification failed. Please try again.'},403,origin);
  const db=createClient(url,key,{auth:{persistSession:false}});
  const result=await db.from('customer_reviews').insert({display_name:name,rating,body,status:'pending'});
  if(result.error){console.error('Review insert failed',result.error.message);return response({error:'Could not save review'},503,origin);}
  return response({ok:true,message:'Thank you! Your review has been submitted for moderation.'},200,origin);
 }catch(e){console.error('Review submit failed',e);return response({error:'Unable to submit review'},500,origin);}
});
