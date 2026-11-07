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
async function showSummary(){
 const host=$('home-review-summary');if(!host)return;
 const avg=$('home-review-average'),total=$('home-review-total'),starsHost=$('home-review-stars');
 if(!client){avg.textContent='—';total.textContent='Ratings are currently unavailable';return;}
 try{
  // Page through approved ratings so the average covers all reviews, not merely
  // a featured 5-star subset or Supabase's first 1,000 rows.
  let count=0,sum=0,start=0;
  const pageSize=500;
  while(true){
   const response=await client.from('customer_reviews')
    .select('rating').eq('status','approved')
    .order('created_at',{ascending:false}).order('id',{ascending:false})
    .range(start,start+pageSize-1);
   if(response.error)throw response.error;
   const rows=response.data||[];
   for(const review of rows){const rating=Number(review.rating);if(Number.isInteger(rating)&&rating>=1&&rating<=5){sum+=rating;count++;}}
   if(rows.length<pageSize)break;
   start+=pageSize;
  }
  if(!count){
   avg.textContent='—';
   total.textContent='No published reviews yet';
   starsHost.textContent='☆☆☆☆☆';
   host.setAttribute('aria-label','No published customer ratings yet');
   return;
  }
  const mean=sum/count;
  avg.textContent=mean.toFixed(1)+' / 5';
  total.textContent=count.toLocaleString()+' approved '+(count===1?'review':'reviews');
  const rounded=Math.round(mean);
  starsHost.textContent='★'.repeat(rounded)+'☆'.repeat(5-rounded);
  host.setAttribute('aria-label','Average '+mean.toFixed(1)+' out of 5 stars from '+count+' approved customer '+(count===1?'review':'reviews'));
 }catch(error){
  avg.textContent='—';total.textContent='Ratings temporarily unavailable';starsHost.textContent='☆☆☆☆☆';
  console.warn('Review summary failed to load',error);
 }
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
document.addEventListener('DOMContentLoaded',()=>{showSummary();showHome();showAll();form();});
})();