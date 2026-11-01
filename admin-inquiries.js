(()=>{'use strict';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client=null,items=[];
function note(s){$('inquiries-message').textContent=s;}
function render(){
 const q=$('inquiry-search').value.toLowerCase().trim(),filter=$('inquiry-status-filter').value;
 const list=$('inquiries-list');list.replaceChildren();
 const matching=items.filter(x=>(!filter||x.status===filter)&&(!q||[x.name,x.email,x.order_number,x.topic,x.message].join(' ').toLowerCase().includes(q)));
 for(const x of matching){
  const article=document.createElement('article');article.className='manager-order-card';
  article.style.display='block';article.style.marginBottom='12px';
  const date=new Date(x.created_at).toLocaleString();
  article.innerHTML='<div><strong>'+escape(x.name)+'</strong> <span class="product-pill">'+escape(x.status.replace('_',' '))+'</span><small>'+escape(date)+'</small></div><p><strong>'+escape(x.topic)+'</strong> · '+escape(x.email)+'</p><p><strong>Order:</strong> '+escape(x.order_number||'Not provided')+'</p><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+escape(x.message)+'</p><p><small>Acknowledgment: '+(x.acknowledgment_sent_at?'accepted by Resend':'not confirmed')+'</small></p>';
  const actions=document.createElement('div');actions.className='product-actions';
  const reply=document.createElement('a');reply.className='admin-button secondary';reply.href='mailto:'+encodeURIComponent(x.email)+'?subject='+encodeURIComponent('Re: Janiks Aniks '+x.topic);reply.textContent='Reply by email';actions.append(reply);
  const select=document.createElement('select');select.setAttribute('aria-label','Inquiry status');for(const [v,label] of [['new','New'],['in_progress','In progress'],['resolved','Resolved']]){const opt=document.createElement('option');opt.value=v;opt.textContent=label;select.append(opt);}select.value=x.status;
  select.addEventListener('change',async()=>{select.disabled=true;const response=await client.from('contact_inquiries').update({status:select.value}).eq('id',x.id);select.disabled=false;if(response.error){note('Could not update status: '+response.error.message);select.value=x.status;}else{x.status=select.value;render();note('Status saved.');}});
  actions.append(select);article.append(actions);list.append(article);
 }
 if(!matching.length)note('No matching inquiries.');else note(matching.length+' inquiry/inquiries.');
}
async function load(){if(!client)return;note('Loading inquiries…');const r=await client.from('contact_inquiries').select('id,created_at,name,email,topic,order_number,message,status,acknowledgment_sent_at').order('created_at',{ascending:false}).limit(200);if(r.error){note('Cannot load inbox: '+r.error.message+' — run supabase/contact-inquiries.sql first.');return;}items=r.data||[];render();}
document.addEventListener('DOMContentLoaded',()=>{
 const cfg=window.JANIKS_SUPABASE_CONFIG||{};if(!window.supabase||!cfg.projectUrl||!cfg.publishableKey)return;
 client=window.supabase.createClient(cfg.projectUrl,cfg.publishableKey);
 $('tab-inquiries').addEventListener('click',()=>{
  for(const name of ['products','orders','inventory','analytics','inquiries']){const tab=$('tab-'+name),panel=$(name+'-panel');if(tab){tab.classList.toggle('active',name==='inquiries');tab.setAttribute('aria-selected',String(name==='inquiries'));}if(panel)panel.hidden=name!=='inquiries';}
  load();
 });
 $('refresh-inquiries').addEventListener('click',load);
 $('inquiry-search').addEventListener('input',render);$('inquiry-status-filter').addEventListener('change',render);
 window.JaniksInquiries={load};
});
})();