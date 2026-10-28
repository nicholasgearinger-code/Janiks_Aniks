(function(){'use strict';
var cfg=window.JANIKS_SUPABASE_CONFIG||{},client=null,user=null,mode='signin',recovering=false;
var $=id=>document.getElementById(id),show=id=>['account-loading','account-auth','account-home','account-recovery'].forEach(k=>$(k).hidden=k!==id);
var esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(id,s){$(id).textContent=s;}
function authMode(next){mode=next;$('show-signin').classList.toggle('active',mode==='signin');$('show-signup').classList.toggle('active',mode==='signup');$('customer-auth-submit').textContent=mode==='signin'?'Sign in':'Create account';$('customer-forgot').hidden=mode!=='signin';$('customer-password').autocomplete=mode==='signin'?'current-password':'new-password';message('customer-auth-message','');}
async function loadProfile(){
 show('account-home');$('customer-welcome').textContent='Signed in as '+user.email;
 var r=await client.from('customer_profiles').select('display_name,phone').eq('user_id',user.id).maybeSingle();
 if(r.error)message('customer-profile-message','Profile unavailable. Run supabase/customers.sql. '+r.error.message);
 else{$('customer-name').value=r.data?.display_name||'';$('customer-phone').value=r.data?.phone||'';message('customer-profile-message','');}
 await loadWishlist();
}
async function loadWishlist(){
 var box=$('customer-wishlist');box.textContent='Loading favorites…';
 var r=await client.from('customer_wishlists').select('product_slug').eq('user_id',user.id).order('created_at',{ascending:false});
 if(r.error){box.textContent='Favorites unavailable. Run supabase/customers.sql.';return;}
 box.replaceChildren();if(!r.data.length){box.textContent='No favorites yet. Browse products and tap ♡ to save them.';return;}
 for(const row of r.data){var p=(window.JANIKS_PRODUCTS_BY_SLUG||{})[row.product_slug];var item=document.createElement('div');item.className='favorite-row';var link=document.createElement('a');link.href='product.html?slug='+encodeURIComponent(row.product_slug);link.textContent=p?.name||row.product_slug;var remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.addEventListener('click',async()=>{var d=await client.from('customer_wishlists').delete().eq('user_id',user.id).eq('product_slug',row.product_slug);if(!d.error)loadWishlist();});item.append(link,remove);box.appendChild(item);}
}
async function route(){var r=await client.auth.getUser();user=r.data?.user||null;if(recovering){show('account-recovery');return;}if(user)await loadProfile();else show('account-auth');}
document.addEventListener('DOMContentLoaded',async()=>{
 if(!/^https:\/\//.test(cfg.projectUrl||'')||!cfg.publishableKey||!window.supabase){$('account-loading').textContent='Customer accounts need Supabase configuration.';return;}
 client=window.supabase.createClient(cfg.projectUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 $('show-signin').onclick=()=>authMode('signin');$('show-signup').onclick=()=>authMode('signup');
 $('customer-auth-form').addEventListener('submit',async e=>{e.preventDefault();var btn=$('customer-auth-submit');btn.disabled=true;message('customer-auth-message','Please wait…');
 var email=$('customer-email').value.trim(),password=$('customer-password').value;
 try{var r=mode==='signup'?await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword({email,password});
 if(r.error)throw r.error;
 if(mode==='signup'&&!r.data.session)message('customer-auth-message','Check your email for a confirmation link, then sign in.');
 else await route();
 }catch(err){message('customer-auth-message',err.message||'Unable to sign in.');}finally{btn.disabled=false;}});
 $('customer-forgot').onclick=async()=>{var email=$('customer-email').value.trim();if(!email){message('customer-auth-message','Enter your email address first.');return;}var r=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});message('customer-auth-message',r.error?r.error.message:'If this email is registered, a reset link will be sent.');};
 $('customer-recovery-form').addEventListener('submit',async e=>{e.preventDefault();var r=await client.auth.updateUser({password:$('customer-new-password').value});message('customer-recovery-message',r.error?r.error.message:'Password updated.');if(!r.error){recovering=false;await route();}});
 $('customer-signout').onclick=async()=>{await client.auth.signOut();user=null;show('account-auth');};
 $('customer-profile-form').addEventListener('submit',async e=>{e.preventDefault();var r=await client.from('customer_profiles').upsert({user_id:user.id,display_name:$('customer-name').value.trim(),phone:$('customer-phone').value.trim()},{onConflict:'user_id'});message('customer-profile-message',r.error?r.error.message:'Your details are saved ♡');});
 client.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recovering=true;show('account-recovery');}if(event==='SIGNED_OUT'){user=null;recovering=false;show('account-auth');}});
 await Promise.resolve(window.JANIKS_PRODUCTS_READY).catch(()=>{});await route();
});
})();