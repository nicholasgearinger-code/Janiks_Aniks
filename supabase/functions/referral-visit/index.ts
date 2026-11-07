import {createClient} from 'npm:@supabase/supabase-js@2';
const origins=['https://janiksaniks.com','https://www.janiksaniks.com'];
const sources=['Direct','Google','Facebook','Instagram','TikTok','Other search','Other social','Other website'];
function reply(status:number,origin:string){
 return new Response(null,{status,headers:{
  'Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],
  'Access-Control-Allow-Headers':'content-type,apikey',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Cache-Control':'no-store','Vary':'Origin'
 }});
}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return reply(204,origin);
 if(req.method!=='POST')return reply(405,origin);
 if(!origins.includes(origin))return reply(403,origin);
 try{
  if(Number(req.headers.get('content-length')||0)>512)return reply(413,origin);
  const raw=await req.text();
  if(raw.length>512)return reply(413,origin);
  const body=JSON.parse(raw);
  const id=String(body.visitorId||'');
  const source=String(body.source||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||!sources.includes(source))return reply(400,origin);
  const salt=Deno.env.get('VISITOR_HASH_SECRET'),url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!salt||salt.length<32||!url||!key){
   console.error('[referral-visit] Required analytics configuration missing; verify secret names');
   return reply(503,origin);
  }
  const bytes=new TextEncoder().encode(salt+':'+id);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  const hash=Array.from(digest).map(v=>v.toString(16).padStart(2,'0')).join('');
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const field=(name:string)=>parts.find(p=>p.type===name)?.value||'';
  const day=field('year')+'-'+field('month')+'-'+field('day');
  const db=createClient(url,key,{auth:{persistSession:false}});
  const saved=await db.from('site_referral_days').upsert({
   visit_day:day,visitor_hash:hash,source
  },{onConflict:'visit_day,visitor_hash',ignoreDuplicates:true});
  if(saved.error){console.error('[referral-visit] Insert failed:',saved.error.message);return reply(503,origin);}
  return reply(204,origin);
 }catch(e){console.error('[referral-visit] Invalid request:',e instanceof Error?e.message:'error');return reply(400,origin);}
});