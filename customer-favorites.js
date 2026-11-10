/* Reuse the same favorites button on every Janiks Aniks product page. */
(function(){
 'use strict';
 document.addEventListener('DOMContentLoaded',async function(){
  var add=document.getElementById('add-to-cart');if(!add)return;
  var btn=document.getElementById('product-favorite');
  if(!btn){btn=document.createElement('button');btn.id='product-favorite';btn.type='button';btn.className='ja-product-favorite';add.insertAdjacentElement('afterend',btn);}
  btn.textContent='♡ Save to favorites';
  var slug=new URLSearchParams(location.search).get('slug');
  if(!slug){btn.disabled=true;return;}
  var cfg=window.JANIKS_SUPABASE_CONFIG||{};
  if(!window.supabase||!cfg.projectUrl||!cfg.publishableKey){
   btn.disabled=true;btn.textContent='♡ Favorites unavailable';return;
  }
  var client=window.supabase.createClient(cfg.projectUrl,cfg.publishableKey);
  try{
   var identity=await client.auth.getUser(),user=identity.data&&identity.data.user;
   if(!user){btn.disabled=false;btn.textContent='♡ Sign in to save';btn.addEventListener('click',function(){location.href='account.html';});return;}
   var check=await client.from('customer_wishlists').select('product_slug').eq('user_id',user.id).eq('product_slug',slug).maybeSingle();
   if(check.error)throw check.error;
   var saved=!!check.data;
   function label(){btn.textContent=saved?'♥ Saved to favorites':'♡ Save to favorites';btn.setAttribute('aria-pressed',String(saved));}
   label();btn.disabled=false;
   btn.addEventListener('click',async function(){
    btn.disabled=true;
    var result=saved?await client.from('customer_wishlists').delete().eq('user_id',user.id).eq('product_slug',slug):
      await client.from('customer_wishlists').insert({user_id:user.id,product_slug:slug});
    btn.disabled=false;
    if(result.error){btn.textContent='Could not save — try again';return;}
    saved=!saved;label();
   });
  }catch(error){btn.disabled=true;btn.textContent='♡ Favorites temporarily unavailable';console.warn('[Janiks favorites]',error&&error.message||error);}
 });
})();
