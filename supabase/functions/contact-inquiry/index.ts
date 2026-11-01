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
  // Store only validated inquiries. The service role bypasses public RLS.
  const supabaseUrl=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!supabaseUrl||!serviceKey)return respond({error:'Contact inbox is not configured'},503);
  const db=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  const {data:inquiry,error:saveError}=await db.from('contact_inquiries').insert({name,email,topic,order_number:order,message,status:'new'}).select('id').single();
  if(saveError||!inquiry){console.error('Contact inbox insert failed',saveError);return respond({error:'Could not record inquiry'},503);}
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
  await db.from('contact_inquiries').update({owner_notified_at:new Date().toISOString()}).eq('id',inquiry.id);
  // Acknowledgment is sent only after the owner's message is accepted.
  const acknowledgment=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':'janiks-contact-ack-'+inquiry.id},body:JSON.stringify({
    from:'Janiks Aniks <orders@janiksaniks.com>',to:[email],
    subject:'We received your message ♡ | Janiks Aniks',
    html:'<div style="background:#fff5f8;font:16px Arial,sans-serif;color:#6b2944;padding:32px"><div style="max-width:550px;margin:auto;background:white;border-radius:18px;padding:28px"><div style="text-align:center;background:#fbe7ee;border-radius:14px;padding:22px 14px;margin-bottom:26px"><a href="https://janiksaniks.com/" style="text-decoration:none"><img src="https://janiksaniks.com/images/janiks-aniks-logo-horizontal-notag.png" alt="Janiks Aniks" width="300" style="display:block;width:100%;max-width:300px;height:auto;border:0;margin:0 auto"></a></div><h2>Thank you for reaching out!</h2><p>Hi '+safe(name)+',</p><p>We received your '+safe(topic.toLowerCase())+' and will review it as soon as possible.</p><p>For reference, your inquiry number is <strong>'+safe(inquiry.id.slice(0,8).toUpperCase())+'</strong>.</p><p>If you need to add details, you can submit another message through <a href="https://janiksaniks.com/contact.html">our contact page</a>.</p><p>Made with love, Janiks Aniks ♡</p></div></div>',
    text:'Hi '+name+', we received your '+topic.toLowerCase()+'. Reference: '+inquiry.id.slice(0,8).toUpperCase()+'. Thank you for contacting Janiks Aniks.'
  })});
  if(acknowledgment.ok)await db.from('contact_inquiries').update({acknowledgment_sent_at:new Date().toISOString()}).eq('id',inquiry.id);
  else console.error('Contact acknowledgment failed',acknowledgment.status);
  return respond({ok:true,acknowledgmentAccepted:acknowledgment.ok});
 }catch(err){console.error('Contact request failed',err);return respond({error:'Unable to submit your message at this time'},500);}
});
