(function(){'use strict';const $=id=>document.getElementById(id),config=window.JANIKS_SUPABASE_CONFIG||{},money=n=>'₱'+n.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
function cart(){try{return JSON.parse(localStorage.getItem('janiks-aniks-cart-v1')||'[]')}catch{return []}}
document.addEventListener('DOMContentLoaded',async()=>{await Promise.resolve(window.JANIKS_PRODUCTS_READY).catch(()=>{});const products=window.JANIKS_PRODUCTS_BY_SLUG||{},lines=cart().filter(x=>products[x.slug]?.available&&products[x.slug]?.published&&Number(products[x.slug].price)>0&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=99),host=$('checkout-lines');let total=0;
for(const x of lines){const p=products[x.slug],row=document.createElement('p');row.textContent=p.name+' × '+x.quantity+' — '+money(Number(p.price)*x.quantity);host.append(row);total+=Number(p.price)*x.quantity;}
$('checkout-total').textContent=money(total);
if(window.supabase&&config.projectUrl&&config.publishableKey){try{const client=window.supabase.createClient(config.projectUrl,config.publishableKey);const auth=await client.auth.getUser();if(auth.data?.user){$('checkout-email').value=auth.data.user.email||'';const profile=await client.from('customer_profiles').select('display_name,phone').eq('user_id',auth.data.user.id).maybeSingle();if(profile.data){$('checkout-name').value=profile.data.display_name||'';$('checkout-phone').value=profile.data.phone||'';}const addresses=await client.from('customer_addresses').select('id,label,recipient_name,line1,barangay,city,province,postal_code').eq('user_id',auth.data.user.id).order('created_at',{ascending:false});if(!addresses.error&&addresses.data?.length){$('saved-address-section').hidden=false;const select=$('saved-address-select');for(const address of addresses.data){const option=document.createElement('option');option.value=address.id;option.textContent=address.label+' — '+address.city;select.append(option);}select.addEventListener('change',()=>{const address=addresses.data.find(x=>x.id===select.value);$('saved-address-preview').textContent=address?[address.recipient_name,address.line1,address.barangay,address.city,address.province,address.postal_code].filter(Boolean).join(', '):'';});}}}catch(error){console.warn('Optional account details unavailable',error);}}
const enabled=config.gcashCheckoutEnabled===true&&!!config.gcashQrImage&&!!config.gcashPaymentLink&&lines.length>0;
$('checkout-submit').disabled=!enabled;$('checkout-submit').textContent=enabled?'Place order — pay with GCash':'GCash checkout not yet activated';
if(!lines.length)$('checkout-message').textContent='Your bag is empty or its items are not available. Please return to the shop.';
$('checkout-form').addEventListener('submit',async e=>{e.preventDefault();if(!enabled)return;const button=$('checkout-submit');button.disabled=true;$('checkout-message').textContent='Preparing secure checkout…';
try{
 const client=window.supabase.createClient(config.projectUrl,config.publishableKey);
 const session=await client.auth.getSession();
 if(!session.data?.session?.access_token)throw Error('Sign in to your customer account before placing an order.');
 const response=await fetch(config.projectUrl+'/functions/v1/create-gcash-order',{
  method:'POST',headers:{'Content-Type':'application/json','apikey':config.publishableKey,'Authorization':'Bearer '+session.data.session.access_token},
  body:JSON.stringify({name:$('checkout-name').value.trim(),phone:$('checkout-phone').value.trim(),fulfillment:$('checkout-fulfillment').value,items:lines.map(x=>({slug:x.slug,quantity:x.quantity}))})
 });
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'Unable to create GCash order');
 $('checkout-message').textContent='Order '+data.order_number+' recorded. Payment is pending until the store receives and verifies your GCash transaction. Only after verification will your items be arranged for transfer to the pickup store. Please wait for a ready-for-pickup notification. Use the QR code or payment link below, paying exactly '+money(data.total)+'.';
 const area=$('gcash-payments');area.hidden=false;
 const img=$('gcash-qr');img.src=config.gcashQrImage;
 $('gcash-link').href=config.gcashPaymentLink;
 $('gcash-order-number').textContent=data.order_number;
 $('gcash-total').textContent=money(data.total);
 button.textContent='Order submitted';button.disabled=true;
 }catch(error){$('checkout-message').textContent=error.message||'Checkout unavailable';button.disabled=false;}});
});})();