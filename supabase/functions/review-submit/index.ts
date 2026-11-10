import {createClient} from 'npm:@supabase/supabase-js@2';
const permitted=['https://janiksaniks.com','https://www.janiksaniks.com'];
const response=(data:unknown,status=200,origin='https://janiksaniks.com')=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':permitted.includes(origin)?origin:permitted[0],'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':permitted.includes(origin)?origin:permitted[0],'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}});
 if(req.method!=='POST')return response({error:'Method not allowed'},405,origin);
 if(!permitted.includes(origin))return response({error:'Origin not allowed'},403,origin);
 try{
  if(Number(req.headers.get('content-length')||0)>1500000)return response({error:'Submission too large'},413,origin);
  const raw=await req.text();if(raw.length>1500000)return response({error:'Submission too large'},413,origin);
  const data=JSON.parse(raw);
  const name=String(data.name||'').trim(),body=String(data.body||'').trim(),rating=Number(data.rating),token=String(data.turnstileToken||'');
  if(name.length<2||name.length>60||body.length<15||body.length>1200||!Number.isInteger(rating)||rating<1||rating>5||token.length<10)return response({error:'Please complete your name, rating, review and verification.'},400,origin);
  const slug=String(data.productSlug||'').trim();
  if(slug&&!/^[a-z0-9][a-z0-9_-]{0,119}$/.test(slug))return response({error:'Invalid product'},400,origin);
  if(data.photo&&!slug)return response({error:'Select a product before attaching a photo'},400,origin);
  const secret=Deno.env.get('TURNSTILE_SECRET_KEY'),url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!secret||!url||!key)return response({error:'Review service is not configured'},503,origin);
  const form=new FormData();form.set('secret',secret);form.set('response',token);
  const v=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});
  const verified=await v.json();
  if(!verified.success||!['janiksaniks.com','www.janiksaniks.com'].includes(verified.hostname))return response({error:'Security verification failed. Please try again.'},403,origin);
  const db=createClient(url,key,{auth:{persistSession:false}});
  if(slug){
    const product=await db.from('products').select('slug').eq('slug',slug).eq('published',true).maybeSingle();
    if(product.error||!product.data)return response({error:'Product is not available for reviews'},400,origin);
  }
  let photoPath:null|string=null;
  if(data.photo){
    const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(data.photo));
    if(!match)return response({error:'Use a JPG, PNG, or WebP photo'},400,origin);
    const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
    if(bytes.length>1048576||bytes.length<20)return response({error:'Photo must be under 1 MB'},400,origin);
    const mime=match[1];
    const valid=mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
      mime==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:
      bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70&&bytes[8]===87&&bytes[9]===69&&bytes[10]===66&&bytes[11]===80;
    if(!valid)return response({error:'Photo format could not be verified'},400,origin);
    const ext=mime==='image/jpeg'?'jpg':mime==='image/png'?'png':'webp';
    photoPath=crypto.randomUUID()+'.'+ext;
    const upload=await db.storage.from('review-photos').upload(photoPath,bytes,{contentType:mime,upsert:false});
    if(upload.error){console.error('Review photo upload failed',upload.error.message);return response({error:'Could not save review photo. Please try without a photo.'},503,origin);}
  }
  const result=await db.from('customer_reviews').insert({display_name:name,rating,body,status:'pending',...(slug?{product_slug:slug}:{}),...(photoPath?{photo_path:photoPath}:{})});
  if(result.error){if(photoPath)await db.storage.from('review-photos').remove([photoPath]);console.error('Review insert failed',result.error.message);return response({error:'Could not save review'},503,origin);}
  return response({ok:true,message:'Thank you! Your review has been submitted for moderation.'},200,origin);
 }catch(e){console.error('Review submit failed',e);return response({error:'Unable to submit review'},500,origin);}
});
