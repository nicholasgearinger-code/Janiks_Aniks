/* Versioned customer cart sync: optimistic concurrency, per-item reconciliation, polling. */
(function(){
'use strict';
const cfg=window.JANIKS_SUPABASE_CONFIG||{},KEY='janiks-aniks-cart-v1';
let client=null,user=null,version=0,base=new Map(),pending=new Map(),ready=false,busy=false,dirty=false,debounce=null,epoch=0;
const clean=a=>Array.isArray(a)?a.filter(x=>x&&typeof x.slug==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug)&&Number.isInteger(x.quantity)&&x.quantity>=1&&x.quantity<=99).slice(0,100):[];
const read=()=>{try{return clean(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch{return [];}};
const map=a=>new Map(clean(a).map(x=>[x.slug,x.quantity]));
const list=m=>[...m].map(([slug,quantity])=>({slug,quantity})).sort((a,b)=>a.slug.localeCompare(b.slug));
function write(m){const next=list(m);if(JSON.stringify(list(map(read())))===JSON.stringify(next))return;localStorage.setItem(KEY,JSON.stringify(next));document.dispatchEvent(new Event('janiks-cart-updated'));}
function note(s){const e=document.getElementById('cart-sync-status');if(e)e.textContent=s;}
function diff(local,old){const d=new Map();for(const k of new Set([...local.keys(),...old.keys()]))if(local.get(k)!==old.get(k))d.set(k,local.get(k)??null);return d;}
function overlay(remote,edits){const merged=new Map(remote);for(const [k,v] of edits){if(v===null)merged.delete(k);else merged.set(k,v);}return merged;}
async function fetchRemote(){const r=await client.from('customer_cart_state').select('version,items').eq('user_id',user.id).maybeSingle();if(r.error)throw r.error;return {version:Number(r.data?.version||0),items:map(r.data?.items||[])};}
function capture(){if(!ready)return;const current=map(read()),expected=overlay(base,pending),changes=diff(current,expected);for(const [k,v] of changes)pending.set(k,v);if(changes.size){dirty=true;schedule();}}
function schedule(){clearTimeout(debounce);debounce=setTimeout(()=>flush(),450);}
async function flush(){
 if(!ready||!user||busy||!pending.size)return;busy=true;const ticket=epoch;
 try{
  for(let attempt=0;attempt<5;attempt++){
   if(ticket!==epoch)return;
   const edits=new Map(pending),candidate=overlay(base,edits);
   const r=await client.rpc('cart_compare_and_swap',{expected_version:version,new_items:list(candidate)});
   if(r.error)throw r.error;
   const data=Array.isArray(r.data)?r.data[0]:r.data;if(!data)throw Error('No cart response');
   const remote=map(data.current_items||[]);version=Number(data.current_version);base=remote;
   if(data.applied){for(const [k,v] of edits)if(pending.get(k)===v)pending.delete(k);write(overlay(base,pending));dirty=!!pending.size;note(pending.size?'Saving recent changes…':'♡ Your bag is up to date');break;}
   // Another device won the write. Keep local edits for touched products only.
   write(overlay(base,pending));note('Updating your bag with changes from another device…');
  }
  if(pending.size)schedule();
 }catch(e){note('Unable to sync right now. Your changes are saved on this device.');}
 finally{busy=false;}
}
async function refresh(){
 if(!ready||!user||busy)return;busy=true;const ticket=epoch;
 try{const r=await fetchRemote();if(ticket!==epoch)return;
  capture();if(r.version!==version){version=r.version;base=r.items;write(overlay(base,pending));note(pending.size?'Merging your changes…':'♡ Your bag updated from another device');}
  if(pending.size)schedule();
 }catch{note('Offline or sync unavailable. Your bag is saved on this device.');}
 finally{busy=false;}
}
async function begin(u){
 const ticket=++epoch;user=u;ready=false;pending.clear();busy=true;note('Syncing your bag…');
 try{
  const local=map(read()),r=await fetchRemote();if(ticket!==epoch)return;
  version=r.version;base=r.items;
  // On sign-in, only bring local items missing from cloud; never overwrite cloud quantities.
  for(const [k,v] of local)if(!base.has(k))pending.set(k,v);
  ready=true;write(overlay(base,pending));note(pending.size?'Saving your bag…':'♡ Your bag is up to date');
 }catch(e){note('Cart sync needs setup. Your bag remains on this device.');}
 finally{busy=false;if(ready&&pending.size)schedule();}
}
function signout(){epoch++;user=null;ready=false;pending.clear();base.clear();clearTimeout(debounce);note('Sign in to sync your bag across devices.');}
document.addEventListener('DOMContentLoaded',async()=>{
 if(!window.supabase||!cfg.projectUrl||!cfg.publishableKey){note('Bag saved on this device.');return;}
 client=window.supabase.createClient(cfg.projectUrl,cfg.publishableKey);
 document.addEventListener('janiks-cart-changed',capture);
 window.addEventListener('storage',e=>{if(e.key===KEY){capture();document.dispatchEvent(new Event('janiks-cart-updated'));}});
 window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 setInterval(()=>{if(!document.hidden)refresh();},15000);
 client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')signout();else if(event==='SIGNED_IN'&&session?.user&&session.user.id!==user?.id)setTimeout(()=>begin(session.user),0);});
 try{const r=await client.auth.getUser();if(r.data?.user)await begin(r.data.user);else signout();}catch{note('Bag saved on this device.');}
});
})();