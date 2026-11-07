(()=>{'use strict';
const $=id=>document.getElementById(id);
const conf=window.JANIKS_SUPABASE_CONFIG||{};
const connected=!!(conf.projectUrl&&conf.publishableKey&&window.supabase);
const client=connected?window.supabase.createClient(conf.projectUrl,conf.publishableKey):null;
const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
function reviewCard(x){
 const card=document.createElement('article');card.className='review-card';
 const top=document.createElement('div');top.className='review-stars';top.textContent=stars(x.rating);top.setAttribute('aria-label',x.rating+' out of 5 stars');
 const quote=document.createElement('p');quote.textContent=x.body;
 const by=document.createElement('small');by.textContent='— '+x.display_name+' · '+new Date(x.created_at).toLocaleDateString();
 card.append(top,quote,by);return card;
}
async function showHome(){
 const host=$('home-five-star-reviews');if(!host)return;
 if(!client){host.textContent='Reviews will appear here when available.';return;}
 const result=await client.from('customer_reviews').select('display_name,rating,body,created_at').eq('status','approved').eq('rating',5).order('created_at',{ascending:false}).limit(3);
 host.replaceChildren();
 if(result.error){host.textContent='Reviews are currently unavailable.';return;}
 if(!result.data.length){host.textContent='No featured five-star reviews yet. Be the first to share your experience!';return;}
 result.data.forEach(x=>host.append(reviewCard(x)));
}
async function showAll(){
 const host=$('all-customer-reviews');if(!host)return;
 if(!client){host.textContent='Reviews are not configured yet.';return;}
 const result=await client.from('customer_reviews').select('display_name,rating,body,created_at').eq('status','approved').order('created_at',{ascending:false}).limit(100);
 host.replaceChildren();
 if(result.error){host.textContent='Reviews are not available yet.';return;}
 if(!result.data.length){host.textContent='No published reviews yet.';return;}
 const average=result.data.reduce((a,x)=>a+x.rating,0)/result.data.length;
 $('review-average').textContent='Recent reviews: '+average.toFixed(1)+' / 5 from '+result.data.length+' published reviews shown';
 result.data.forEach(x=>host.append(reviewCard(x)));
}
function form(){
 const form=$('customer-review-form');if(!form)return;
 const status=$('review-form-status'),button=$('review-submit-button');
 const ratingInputs=[...form.querySelectorAll('input[name="rating"]')];
 const ratingHint=$('review-rating-hint');
 function updateRating(preview=null){
  const selected=ratingInputs.find(input=>input.checked);
  const value=preview ?? (selected?Number(selected.value):0);
  ratingInputs.forEach(input=>{
   const label=input.closest('.review-star-choice');
   if(label)label.classList.toggle('is-filled',Number(input.value)<=value);
  });
  if(ratingHint)ratingHint.textContent=selected?selected.value+' out of 5 stars selected':'Select your rating';
 }
 ratingInputs.forEach(input=>{
  input.addEventListener('change',()=>updateRating());
  const label=input.closest('.review-star-choice');
  if(label){
   label.addEventListener('mouseenter',()=>updateRating(Number(input.value)));
   label.addEventListener('mouseleave',()=>updateRating());
   input.addEventListener('focus',()=>updateRating(Number(input.value)));
   input.addEventListener('blur',()=>updateRating());
  }
 });
 updateRating();

 if(!connected||!conf.turnstileSiteKey){status.textContent='Reviews are not yet configured.';return;}
 let widget=null,token='';
 const init=()=>{
  if(!window.turnstile){status.textContent='Loading security verification…';return false;}
  if(widget!==null)return true;
  widget=window.turnstile.render('#review-turnstile',{sitekey:conf.turnstileSiteKey,callback:v=>{token=v;status.textContent='Ready to send your review.';button.disabled=false;},'expired-callback':()=>{token='';button.disabled=true;},'error-callback':()=>{token='';button.disabled=true;status.textContent='Security check failed. Refresh and retry.';}});
  return true;
 };
 let attempts=0;const poll=setInterval(()=>{attempts++;if(init()||attempts>=35){clearInterval(poll);if(attempts>=35&&widget===null)status.textContent='Verification could not load. Check browser content blockers.';}},200);
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(!token)return;button.disabled=true;status.textContent='Submitting review…';
  try{
   const result=await fetch(conf.projectUrl+'/functions/v1/review-submit',{method:'POST',headers:{'Content-Type':'application/json','apikey':conf.publishableKey},body:JSON.stringify({name:$('review-name').value,rating:Number(form.elements.rating.value),body:$('review-body').value,turnstileToken:token})});
   const data=await result.json().catch(()=>({}));if(!result.ok)throw Error(data.error||'Could not submit review.');
   form.reset();updateRating();status.textContent=data.message||'Thank you! Review submitted for moderation.';
  }catch(error){status.textContent=error.message||'Unable to send review';}
  finally{token='';if(widget!==null&&window.turnstile)window.turnstile.reset(widget);}
 });
}
document.addEventListener('DOMContentLoaded',()=>{showHome();showAll();form();});
})();