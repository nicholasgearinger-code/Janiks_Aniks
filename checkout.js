(function(){'use strict';const $=id=>document.getElementById(id),config=window.JANIKS_SUPABASE_CONFIG||{},money=n=>'₱'+n.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
function cart(){try{return JSON.parse(localStorage.getItem('janiks-aniks-cart-v1')||'[]')}catch{return []}}
document.addEventListener('DOMContentLoaded',async()=>{await Promise.resolve(window.JANIKS_PRODUCTS_READY).catch(()=>{});const products=window.JANIKS_PRODUCTS_BY_SLUG||{},lines=cart().filter(x=>products[x.slug]?.available&&products[x.slug]?.published&&Number(products[x.slug].price)>0&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=99),host=$('checkout-lines');let total=0;
for(const x of lines){const p=products[x.slug],row=document.createElement('p');row.textContent=p.name+' × '+x.quantity+' — '+money(Number(p.price)*x.quantity);host.append(row);total+=Number(p.price)*x.quantity;}
$('checkout-total').textContent=money(total);
const enabled=config.checkoutEnabled===true&&lines.length>0;
$('checkout-submit').disabled=!enabled;$('checkout-submit').textContent=enabled?'Continue to secure payment':'Checkout not yet activated';
if(!lines.length)$('checkout-message').textContent='Your bag is empty or its items are not available. Please return to the shop.';
$('checkout-form').addEventListener('submit',async e=>{e.preventDefault();if(!enabled)return;const button=$('checkout-submit');button.disabled=true;$('checkout-message').textContent='Preparing secure checkout…';
try{const response=await fetch(config.projectUrl+'/functions/v1/create-checkout',{method:'POST',headers:{'Content-Type':'application/json','apikey':config.publishableKey},body:JSON.stringify({name:$('checkout-name').value.trim(),email:$('checkout-email').value.trim(),phone:$('checkout-phone').value.trim(),fulfillment:$('checkout-fulfillment').value,items:lines.map(x=>({slug:x.slug,quantity:x.quantity}))})});
const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to create checkout');
if(!/^https:\/\/checkout\.paymongo\.com\//.test(data.checkout_url||''))throw Error('Unexpected payment destination');
location.assign(data.checkout_url);
}catch(error){$('checkout-message').textContent=error.message||'Checkout unavailable';button.disabled=false;}});
});})();