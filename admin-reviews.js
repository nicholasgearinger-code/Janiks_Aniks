(()=>{'use strict';
const $=id=>document.getElementById(id);let client=null,rows=[];
const labels={pending:'Pending',approved:'Approved',rejected:'Rejected'};
function status(t){$('admin-review-message').textContent=t;}
function setBadge(n){const b=$('review-pending-badge');if(b){b.hidden=!n;b.textContent=n>99?'99+':String(n||0);}}
async function refreshBadge(){if(!client)return;const session=await client.auth.getSession();if(!session.data.session){setBadge(0);return;}const result=await client.from('customer_reviews').select('id',{head:true,count:'exact'}).eq('status','pending');if(!result.error)setBadge(result.count||0);}
function render(){
 const host=$('admin-review-list');host.replaceChildren();
 const filter=$('admin-review-filter').value;const matches=rows.filter(x=>!filter||x.status===filter);
 matches.forEach(x=>{
  const card=document.createElement('article');card.className='review-card';
  const stars=document.createElement('div');stars.className='review-stars';stars.textContent='★'.repeat(x.rating)+'☆'.repeat(5-x.rating);
  const title=document.createElement('strong');title.textContent=x.display_name+' · '+labels[x.status];
  const text=document.createElement('p');text.textContent=x.body;
  const date=document.createElement('small');date.textContent=new Date(x.created_at).toLocaleDateString();
  const actions=document.createElement('div');actions.className='review-moderation-actions';
  for(const [key,label] of [['approved','Approve'],['rejected','Reject spam'],['pending','Return to pending']]){
   const button=document.createElement('button');button.type='button';button.className='admin-button secondary';button.textContent=label;button.disabled=x.status===key;
   button.addEventListener('click',async()=>{button.disabled=true;status('Saving review status…');const result=await client.from('customer_reviews').update({status:key}).eq('id',x.id).select('id,status').single();if(result.error){status('Could not update: '+result.error.message);button.disabled=false;return;}x.status=result.data.status;render();refreshBadge();status('Review status saved.');});
   actions.append(button);
  }
  card.append(stars,title,date,text,actions);host.append(card);
 });
 status(matches.length+' reviews shown.');
 if(!matches.length){const empty=document.createElement('p');empty.textContent='No reviews in this category.';host.append(empty);}
}
async function load(){if(!client)return;status('Loading customer reviews…');const result=await client.from('customer_reviews').select('id,display_name,rating,body,status,created_at').order('created_at',{ascending:false}).limit(200);if(result.error){status('Reviews unavailable: '+result.error.message+' — run supabase/reviews-and-visits.sql first.');return;}rows=result.data||[];render();refreshBadge();}
function open(){for(const name of ['overview','products','analytics','inventory','inquiries','orders','reviews']){const tab=$('tab-'+name),panel=$(name+'-panel');if(tab){tab.classList.toggle('active',name==='reviews');tab.setAttribute('aria-selected',String(name==='reviews'));}if(panel)panel.hidden=name!=='reviews';}load();}
document.addEventListener('DOMContentLoaded',()=>{
 $('tab-reviews').addEventListener('click',open);
 $('refresh-admin-reviews').addEventListener('click',load);
 $('admin-review-filter').addEventListener('change',render);
 window.JaniksReviews={init(c){client=c;refreshBadge();},clear(){client=null;rows=[];setBadge(0);}};
 window.addEventListener('focus',()=>{if(client)refreshBadge();});
});
})();