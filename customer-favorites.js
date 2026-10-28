(function(){'use strict';document.addEventListener('DOMContentLoaded',async function(){
var btn=document.createElement('button');btn.type='button';btn.className='btn';btn.textContent='♡ Save to favorites';btn.style.margin='8px 0';
var target=document.getElementById('add-to-cart');if(!target)return;target.insertAdjacentElement('afterend',btn);
var cfg=window.JANIKS_SUPABASE_CONFIG||{};if(!window.supabase||!cfg.projectUrl||!cfg.publishableKey){btn.disabled=true;return;}
var client=window.supabase.createClient(cfg.projectUrl,cfg.publishableKey);
var slug=new URLSearchParams(location.search).get('slug');if(!slug){btn.disabled=true;return;}
var current=await client.auth.getUser(),user=current.data?.user;if(!user){btn.textContent='♡ Sign in to save';btn.onclick=()=>location.href='account.html';return;}
var check=await client.from('customer_wishlists').select('product_slug').eq('user_id',user.id).eq('product_slug',slug).maybeSingle();
var saved=!!check.data;btn.textContent=saved?'♥ Saved to favorites':'♡ Save to favorites';
btn.onclick=async()=>{btn.disabled=true;var r=saved?await client.from('customer_wishlists').delete().eq('user_id',user.id).eq('product_slug',slug):await client.from('customer_wishlists').insert({user_id:user.id,product_slug:slug});btn.disabled=false;if(r.error){btn.textContent='Could not save — check account setup';return;}saved=!saved;btn.textContent=saved?'♥ Saved to favorites':'♡ Save to favorites';};
});})();