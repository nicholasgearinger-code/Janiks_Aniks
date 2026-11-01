import { createClient } from 'npm:@supabase/supabase-js@2';
const origin='https://janiksaniks.com';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const safe=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as Record<string,string>)[c]);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 if(req.headers.get('Origin')!==origin)return respond({error:'Origin not allowed'},403);
 const apiKey=Deno.env.get('RESEND_API_KEY');
 const turnstile=Deno.env.get('TURNSTILE_SECRET_KEY');
 const inbox=Deno.env.get('CONTACT_TO_EMAIL');
 if(!apiKey||!turnstile||!inbox)return respond({error:'Contact email is not configured yet'},503);
 try{
  if(Number(req.headers.get('content-length')||0)>12000)return respond({error:'Message too large'},413);
  const body=await req.json();
  const name=String(body.name||'').trim(),email=String(body.email||'').trim(),topic=String(body.topic||'').trim();
  const order=String(body.order||'').trim(),message=String(body.message||'').trim(),token=String(body.turnstileToken||'');
  if(name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!['Product inquiry','Order question','General inquiry','Other'].includes(topic)||order.length>80||message.length<10||message.length>3000||!token)return respond({error:'Please complete all required fields and verification'},400);
  const form=new FormData();form.set('secret',turnstile);form.set('response',token);
  const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});
  const passed=await check.json();
  if(!passed.success||passed.hostname!=='janiksaniks.com')return respond({error:'Security verification unsuccessful; please try again'},403);
  const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({
    from:'Janiks Aniks Contact <orders@janiksaniks.com>',
    to:[inbox],
    reply_to:email,
    subject:'Janiks Aniks inquiry: '+topic,
    html:'<h2>New customer inquiry</h2><p><strong>Name:</strong> '+safe(name)+'</p><p><strong>Email:</strong> '+safe(email)+'</p><p><strong>Topic:</strong> '+safe(topic)+'</p><p><strong>Order:</strong> '+safe(order||'Not provided')+'</p><p style="white-space:pre-wrap">'+safe(message)+'</p>',
    text:['New Janiks Aniks customer inquiry','Name: '+name,'Email: '+email,'Topic: '+topic,'Order: '+(order||'Not provided'),'Message:',message].join('\n')
  })});
  const output=await result.json().catch(()=>({}));
  if(!result.ok||!output.id){console.error('Resend contact failed',result.status);return respond({error:'We could not send your message; please try again later'},502);}
  return respond({ok:true});
 }catch(err){console.error('Contact request failed',err);return respond({error:'Unable to submit your message at this time'},500);}
});
