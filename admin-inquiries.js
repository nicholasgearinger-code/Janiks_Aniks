(()=>{'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client,items=[],loading=false;
const labels={new:'New',in_progress:'In progress',resolved:'Resolved'};
function note(t){$('inquiries-message').textContent=t;}
function counts(){
 const count={new:0,in_progress:0,resolved:0};items.forEach(x=>{if(x.status in count)count[x.status]++;});
 ['new','in_progress','resolved'].forEach(k=>{const node=$('inquiry-count-'+k);if(node)node.textContent=String(count[k]);});
 const badge=$('inquiries-badge');if(badge){badge.textContent=count.new>99?'99+':String(count.new);badge.hidden=count.new===0;}
 const tab=$('tab-inquiries');if(tab)tab.setAttribute('aria-label','Inbox, '+count.new+' new inquiries');
}
function render(){
 counts();
 const q=$('inquiry-search').value.trim().toLowerCase(),filter=$('inquiry-status-filter').value,list=$('inquiries-list');list.replaceChildren();
 const matching=items.filter(x=>(!filter||x.status===filter)&&(!q||[x.name,x.email,x.order_number,x.topic,x.message].join(' ').toLowerCase().includes(q)));
 for(const x of matching){
  const card=document.createElement('article');card.className='inquiry-card inquiry-'+x.status;
  const created=new Date(x.created_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
  const initials=x.name.trim().split(/\s+/).slice(0,2).map(n=>n[0]||'').join('').toUpperCase();
  card.innerHTML='<div class="inquiry-card-top"><div class="inquiry-avatar">'+esc(initials)+'</div><div class="inquiry-identity"><strong>'+esc(x.name)+'</strong><span>'+esc(x.email)+'</span></div><span class="inquiry-status-tag">'+esc(labels[x.status]||x.status)+'</span></div><div class="inquiry-meta"><span>'+esc(x.topic)+'</span><time>'+esc(created)+'</time></div>'+(x.order_number?'<p class="inquiry-order">Order: '+esc(x.order_number)+'</p>':'')+'<p class="inquiry-message">'+esc(x.message)+'</p><div class="inquiry-footer"><span class="inquiry-ack">'+(x.acknowledgment_sent_at?'♡ Customer acknowledgment sent':'Acknowledgment not confirmed')+'</span><div class="inquiry-actions"></div></div>';
  const actions=card.querySelector('.inquiry-actions'),reply=document.createElement('a');reply.className='inquiry-reply';reply.href='mailto:'+encodeURIComponent(x.email)+'?subject='+encodeURIComponent('Re: Janiks Aniks '+x.topic);reply.textContent='Reply by email';actions.append(reply);
  const select=document.createElement('select');select.className='inquiry-status-select';select.setAttribute('aria-label','Status for '+x.name);for(const [value,label] of Object.entries(labels)){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}select.value=x.status;
  select.addEventListener('change',async()=>{const next=select.value,prev=x.status;select.disabled=true;const result=await client.from('contact_inquiries').update({status:next}).eq('id',x.id).select('id,status').single();select.disabled=false;if(result.error){select.value=prev;note('Status could not be saved: '+result.error.message);}else{x.status=result.data.status;render();note('Inquiry status updated.');}});
  actions.append(select);list.append(card);
 }
 if(!matching.length){const empty=document.createElement('div');empty.className='inquiry-empty';empty.textContent=items.length?'No inquiries match these filters.':'No inquiries yet. New customer messages will appear here.';list.append(empty);}
 note(matching.length+' shown · '+items.length+' loaded');
}
async function load(){if(!client||loading)return;loading=true;note('Loading inquiries…');try{const r=await client.from('contact_inquiries').select('id,created_at,name,email,topic,order_number,message,status,acknowledgment_sent_at').order('created_at',{ascending:false}).limit(200);if(r.error)throw r.error;items=r.data||[];render();}catch(err){note('Inbox unavailable: '+err.message);}finally{loading=false;}}
async function badgeRefresh(){if(!client)return;const session=await client.auth.getSession();if(!session.data.session){const badge=$('inquiries-badge');if(badge)badge.hidden=true;return;}const r=await client.from('contact_inquiries').select('id',{head:true,count:'exact'}).eq('status','new');if(!r.error){const badge=$('inquiries-badge');if(badge){badge.textContent=r.count>99?'99+':String(r.count||0);badge.hidden=!r.count;}}}
document.addEventListener('DOMContentLoaded',()=>{
 const cfg=window.JANIKS_SUPABASE_CONFIG||{};if(!window.supabase||!cfg.projectUrl||!cfg.publishableKey)return;
 client=window.supabase.createClient(cfg.projectUrl,cfg.publishableKey);
 $('tab-inquiries').addEventListener('click',()=>{for(const name of ['products','orders','inventory','analytics','inquiries']){const tab=$('tab-'+name),panel=$(name+'-panel');if(tab){tab.classList.toggle('active',name==='inquiries');tab.setAttribute('aria-selected',String(name==='inquiries'));}if(panel)panel.hidden=name!=='inquiries';}load();});
 $('refresh-inquiries').addEventListener('click',load);$('inquiry-search').addEventListener('input',render);$('inquiry-status-filter').addEventListener('change',render);
 client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){$('inquiries-badge').hidden=true;items=[];}else if(event==='SIGNED_IN')setTimeout(badgeRefresh,0);});
 badgeRefresh();window.addEventListener('focus',badgeRefresh);
 window.JaniksInquiries={load};
});
})();