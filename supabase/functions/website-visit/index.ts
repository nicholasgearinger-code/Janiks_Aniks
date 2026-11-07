import {createClient} from 'npm:@supabase/supabase-js@2';
const origins=['https://janiksaniks.com','https://www.janiksaniks.com'];
const reply=(status:number,origin:string)=>new Response(null,{status,headers:{'Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return reply(204,origin);
 if(req.method!=='POST')return reply(405,origin);
 if(!origins.includes(origin))return reply(403,origin);
 try{
  if(Number(req.headers.get('content-length')||0)>512)return reply(413,origin);
  const body=await req.text();if(body.length>512)return reply(413,origin);
  const id=String(JSON.parse(body).visitorId||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return reply(400,origin);
  const salt=Deno.env.get('VISITOR_HASH_SECRET'),url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!salt||salt.length<32||!url||!key){console.error('[website-visit] Missing or short VISITOR_HASH_SECRET, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY; check Edge Function secrets.');return reply(503,origin);}
  const bytes=new TextEncoder().encode(salt+':'+id);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  const hash=Array.from(digest).map(x=>x.toString(16).padStart(2,'0')).join('');
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const field=(name:string)=>parts.find(p=>p.type===name)?.value||'';
  const day=field('year')+'-'+field('month')+'-'+field('day');
  const db=createClient(url,key,{auth:{persistSession:false}});
  const saved=await db.from('site_visit_days').upsert({visit_day:day,visitor_hash:hash},{onConflict:'visit_day,visitor_hash',ignoreDuplicates:true});
  if(saved.error){console.error('Visitor insert error',saved.error.message);return reply(503,origin);}
  return reply(204,origin);
 }catch(e){console.error('Visitor count error',e);return reply(400,origin);}
});
