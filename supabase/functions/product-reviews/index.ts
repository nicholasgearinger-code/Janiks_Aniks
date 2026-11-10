import {createClient} from 'npm:@supabase/supabase-js@2';
const allowed=['https://janiksaniks.com','https://www.janiksaniks.com'];
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],'Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'apikey,content-type','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='GET')return reply({error:'Method not allowed'},405);
 if(!allowed.includes(origin))return reply({error:'Origin not allowed'},403);
 const slug=new URL(req.url).searchParams.get('slug')||'';
 if(!/^[a-z0-9][a-z0-9_-]{0,119}$/.test(slug))return reply({error:'Invalid product'},400);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return reply({error:'Not configured'},503);
 const db=createClient(url,key,{auth:{persistSession:false}});
 const result=await db.from('customer_reviews').select('id,display_name,rating,body,created_at,photo_path')
   .eq('status','approved').eq('product_slug',slug).order('created_at',{ascending:false}).limit(30);
 if(result.error)return reply({error:'Review lookup unavailable'},503);
 const reviews=await Promise.all((result.data||[]).map(async row=>{
   let photoUrl=null;
   if(row.photo_path){
     const signed=await db.storage.from('review-photos').createSignedUrl(row.photo_path,900);
     if(!signed.error)photoUrl=signed.data.signedUrl;
   }
   return {id:row.id,display_name:row.display_name,rating:row.rating,body:row.body,created_at:row.created_at,photoUrl};
 }));
 return reply({reviews});
});
