/* Cross-device cart sync for signed-in customers. Keeps guest cart local. */
(function(){
'use strict';
var cfg=window.JANIKS_SUPABASE_CONFIG||{},key='janiks-aniks-cart-v1',client=null,user=null,last='',busy=false,started=false;
function read(){try{var a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a.filter(x=>x&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=99):[];}catch(e){return [];}}
function write(a){localStorage.setItem(key,JSON.stringify(a));last=JSON.stringify(a);document.dispatchEvent(new Event('janiks-cart-updated'));}
function note(s){var e=document.getElementById('cart-sync-status');if(e)e.textContent=s;}
async function sync(initial){
 if(!user||busy)return;busy=true;
 try{
 var r=await client.from('customer_cart_items').select('product_slug,quantity').eq('user_id',user.id);
 if(r.error)throw r.error;
 var remote=r.data||[],local=read(),map=new Map(remote.map(x=>[x.product_slug,x.quantity]));
 if(initial){
 // Merge guest additions with saved cart. Remote quantities win for overlapping products.
 local.forEach(x=>{if(!map.has(x.slug))map.set(x.slug,x.quantity);});
 }else{
 // Local cart is authoritative after initial merge; remove deleted lines remotely.
 map=new Map(local.map(x=>[x.slug,x.quantity]));
 }
 var merged=[...map].map(([slug,quantity])=>({slug,quantity}));
 var updates=merged.map(x=>({user_id:user.id,product_slug:x.slug,quantity:x.quantity}));
 if(updates.length){var up=await client.from('customer_cart_items').upsert(updates,{onConflict:'user_id,product_slug'});if(up.error)throw up.error;}
 if(!initial){var removed=remote.filter(x=>!map.has(x.product_slug)).map(x=>x.product_slug);if(removed.length){var del=await client.from('customer_cart_items').delete().eq('user_id',user.id).in('product_slug',removed);if(del.error)throw del.error;}}
 if(initial){var changed=JSON.stringify(local)!==JSON.stringify(merged);write(merged);if(changed&&document.getElementById('cart-items'))location.reload();}else last=JSON.stringify(local);
 note('♡ Your bag is synced to your account');
 }catch(e){note('Cart sync unavailable — changes remain saved on this device. '+(e.message||''));}
 finally{busy=false;}
}
async function start(){
 if(started)return;started=true;
 if(!window.supabase||!cfg.projectUrl||!cfg.publishableKey)return;
 client=window.supabase.createClient(cfg.projectUrl,cfg.publishableKey);
 var r=await client.auth.getUser();user=r.data?.user||null;
 if(user){note('Syncing your bag…');await sync(true);}else note('Sign in to sync your bag across devices.');
 client.auth.onAuthStateChange(function(event,session){if(event==='SIGNED_IN'&&session?.user&&session.user.id!==user?.id){user=session.user;sync(true);}if(event==='SIGNED_OUT'){user=null;note('Sign in to sync your bag across devices.');}});
 last=JSON.stringify(read());
 setInterval(function(){if(!user||busy)return;var current=JSON.stringify(read());if(current!==last)sync(false);},1200);
 window.addEventListener('focus',function(){if(user&&!busy&&JSON.stringify(read())===last)sync(true);});
}
document.addEventListener('DOMContentLoaded',start);
})();