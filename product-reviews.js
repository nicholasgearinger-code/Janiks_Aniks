/* Product-specific, moderated customer reviews and optional private photos. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const cfg=window.JANIKS_SUPABASE_CONFIG||{};
const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
function productSlug(){return new URLSearchParams(location.search).get('slug')||'';}
function card(review){
 const el=document.createElement('article');el.className='ja-review-card';
 const head=document.createElement('div');head.className='ja-review-card-stars';head.textContent=stars(Number(review.rating));head.setAttribute('aria-label',review.rating+' out of 5 stars');
 const body=document.createElement('p');body.textContent=review.body;
 const by=document.createElement('small');by.textContent='— '+review.display_name+' · '+new Date(review.created_at).toLocaleDateString();
 el.append(head,body,by);
 if(typeof review.photoUrl==='string'&&review.photoUrl.startsWith('https://')){
   const img=document.createElement('img');img.src=review.photoUrl;img.alt='Photo submitted with customer review';img.loading='lazy';img.referrerPolicy='no-referrer';img.className='ja-review-customer-photo';el.appendChild(img);
 }
 return el;
}
async function load(slug){
 const summary=$('ja-review-summary'),host=$('ja-review-cards');if(!summary||!host)return;
 if(!cfg.projectUrl||!cfg.publishableKey){summary.textContent='Reviews are not configured yet.';return;}
 try{
  const url=cfg.projectUrl.replace(/\/$/,'')+'/functions/v1/product-reviews?slug='+encodeURIComponent(slug);
  const res=await fetch(url,{headers:{apikey:cfg.publishableKey}});
  if(!res.ok)throw new Error('Product review service unavailable');
  const data=await res.json(),rows=Array.isArray(data.reviews)?data.reviews:[];
  host.replaceChildren();
  if(!rows.length){summary.textContent='No reviews for this product yet. Be the first to share your experience!';return;}
  const avg=rows.reduce((sum,r)=>sum+Number(r.rating),0)/rows.length;
  summary.textContent=stars(Math.round(avg))+'  '+avg.toFixed(1)+' / 5 · '+rows.length+' recent approved '+(rows.length===1?'review':'reviews');
  rows.forEach(r=>host.appendChild(card(r)));
 }catch(e){summary.textContent='Product reviews are temporarily unavailable.';console.warn('[Janiks product reviews]',e.message);}
}
function form(slug){
 const el=$('ja-product-review-form');if(!el)return;
 const status=$('ja-review-status'),button=$('ja-review-send'),photo=$('ja-review-photo'),preview=$('ja-review-photo-preview');
 let token='',widget=null;
 const radios=[...el.querySelectorAll('input[name="rating"]')];
 function updateStars(){const selected=Number(el.elements.rating.value||0);radios.forEach(r=>r.parentElement.classList.toggle('selected',Number(r.value)<=selected));}
 radios.forEach(r=>r.addEventListener('change',updateStars));
 photo.addEventListener('change',()=>{
  preview.hidden=true;preview.removeAttribute('src');
  const file=photo.files&&photo.files[0];if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1048576){
   status.textContent='Please use a JPG, PNG or WebP image under 1 MB.';photo.value='';return;
  }
  const reader=new FileReader();reader.onload=()=>{preview.src=reader.result;preview.hidden=false;};reader.readAsDataURL(file);
 });
 if(!cfg.projectUrl||!cfg.publishableKey||!cfg.turnstileSiteKey){
  status.textContent='Review submission will be available once the review service is configured.';return;
 }
 let tries=0;
 const polling=setInterval(()=>{
  tries++;
  if(window.turnstile&&widget===null){
   try{widget=window.turnstile.render('#ja-review-turnstile',{sitekey:cfg.turnstileSiteKey,callback:value=>{token=value;button.disabled=false;status.textContent='Ready to submit your review.';},'expired-callback':()=>{token='';button.disabled=true;},'error-callback':()=>{token='';button.disabled=true;status.textContent='Verification failed; please retry.';}});clearInterval(polling);}
   catch(e){clearInterval(polling);status.textContent='Could not load security verification.';}
  }
  if(tries>=35){clearInterval(polling);if(widget===null)status.textContent='Verification could not load. Refresh or check content blockers.';}
 },200);
 el.addEventListener('submit',async e=>{
  e.preventDefault();if(!token||button.disabled)return;
  const file=photo.files&&photo.files[0];button.disabled=true;status.textContent='Submitting review…';
  try{
   let photoData=null;
   if(file){
    if(file.size>1048576||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Photo must be JPG, PNG, or WebP under 1 MB.');
    photoData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read photo'));reader.readAsDataURL(file);});
   }
   const result=await fetch(cfg.projectUrl.replace(/\/$/,'')+'/functions/v1/review-submit',{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.publishableKey},body:JSON.stringify({name:$('ja-review-name').value,rating:Number(el.elements.rating.value),body:$('ja-review-body').value,productSlug:slug,photo:photoData,turnstileToken:token})});
   const data=await result.json().catch(()=>({}));if(!result.ok)throw Error(data.error||'Review could not be sent.');
   el.reset();updateStars();preview.hidden=true;preview.removeAttribute('src');status.textContent='Thank you! Your review will appear after approval.';
  }catch(err){status.textContent=err.message||'Unable to submit review.';}
  finally{token='';if(widget!==null&&window.turnstile)window.turnstile.reset(widget);}
 });
}
document.addEventListener('DOMContentLoaded',async()=>{
 const root=$('product-reviews-section');if(!root)return;
 const slug=productSlug();if(!/^[a-z0-9][a-z0-9_-]{0,119}$/.test(slug))return;
 try{await Promise.resolve(window.JANIKS_PRODUCTS_READY);}catch(_){}
 const product=(window.JANIKS_PRODUCTS_BY_SLUG||{})[slug];
 if(!product||!product.published||!product.available)return;
 root.hidden=false;load(slug);form(slug);
});
})();