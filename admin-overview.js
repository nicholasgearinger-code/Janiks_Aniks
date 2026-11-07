(()=>{'use strict';
const $=id=>document.getElementById(id);
let client=null,busy=false;
function value(id,v){const el=$(id);if(el)el.textContent=v;}
function money(n){return '₱'+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});}
function dayStart(){const d=new Date();d.setHours(0,0,0,0);return d.toISOString();}
async function load(){
 if(!client||busy)return;busy=true;value('overview-status','Refreshing store activity…');
 try{
  const visitResult=await client.rpc('admin_visit_summary');
  if(visitResult.error){
   value('overview-visitors-today','—');value('overview-visitors-month','—');value('overview-visitors-all','—');
  }else{
   const v=Array.isArray(visitResult.data)?visitResult.data[0]:visitResult.data;
   value('overview-visitors-today',Number(v?.visitors_today||0).toLocaleString());
   value('overview-visitors-month',Number(v?.visitors_30d||0).toLocaleString());
   value('overview-visitors-all',Number(v?.visitors_all_time||0).toLocaleString());
  }
  // Keep a zero count distinct from an offline/misconfigured collector.
  // The status is stored only in this browser session; no visitor identifiers
  // or private measurement rows are exposed to this dashboard.
  try{
   const lastResult=sessionStorage.getItem('ja-visit-last-result');
   const current=document.getElementById('overview-visitors-all');
   const allNumber=Number((current?.textContent||'').replace(/,/g,''));
   if(visitResult.error){
    value('overview-visit-health','Visitor analytics unavailable: '+visitResult.error.message);
   }else if(allNumber===0){
    const details=lastResult==='ok'
      ?'This browser reported a successful visit; refresh and confirm the dashboard query.'
      :lastResult?.startsWith('http-')
        ?'This browser saw collector HTTP '+lastResult.slice(5)+'. Check website-visit Edge Function logs and settings.'
        :lastResult==='network-or-cors-error'
          ?'A visit request was blocked or failed. Inspect the browser console and function CORS settings.'
          :'No visits recorded. Open the public homepage once, then refresh this dashboard; check function logs if still zero.';
    value('overview-visit-health',details);
   }else{
    value('overview-visit-health','Anonymous browser visits are recorded. Counts may exclude browsers with tracking blocked.');
   }
  }catch(_e){}
  const [orders,inquiries,products]=await Promise.all([
   client.from('orders').select('id,order_number,created_at,total,payment_status,fulfillment_status').order('created_at',{ascending:false}).limit(500),
   client.from('contact_inquiries').select('id,created_at,status,topic').order('created_at',{ascending:false}).limit(500),
   client.from('products').select('id,published,available').limit(1000)
  ]);
  const errors=[orders,inquiries,products].filter(r=>r.error).map(r=>r.error.message);
  if(errors.length)value('overview-status','Some dashboard data could not load: '+errors.join('; '));
  else value('overview-status','Updated '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));
  const os=orders.data||[],qs=inquiries.data||[],ps=products.data||[];
  const attention=os.filter(o=>!['cancelled','delivered'].includes(o.fulfillment_status)&&(['unpaid','pending'].includes(o.payment_status)||['pending','confirmed','processing'].includes(o.fulfillment_status)));
  const revenue=os.filter(o=>o.payment_status==='paid'&&o.created_at>=dayStart()).reduce((a,o)=>a+Number(o.total||0),0);
  value('overview-revenue',orders.error?'—':money(revenue));
  const monthStart=new Date();monthStart.setDate(1);monthStart.setHours(0,0,0,0);
  const monthRevenue=os.filter(o=>o.payment_status==='paid'&&new Date(o.created_at)>=monthStart).reduce((a,o)=>a+Number(o.total||0),0);
  value('overview-month-revenue',orders.error?'—':money(monthRevenue));
  value('overview-paid-orders',orders.error?'—':String(os.filter(o=>o.payment_status==='paid'&&new Date(o.created_at)>=monthStart).length));
  value('overview-orders',orders.error?'—':String(attention.length));
  value('overview-inquiries',inquiries.error?'—':String(qs.filter(q=>q.status==='new').length));
  value('overview-products',products.error?'—':String(ps.filter(p=>p.published===true&&p.available!==false).length));
  const tasks=$('overview-priorities');tasks.replaceChildren();
  const priorities=[
   {name:'Verify pending payments',qty:os.filter(o=>!['cancelled','delivered'].includes(o.fulfillment_status)&&['pending','unpaid'].includes(o.payment_status)).length,dest:'orders'},
   {name:'Pack and prepare paid orders',qty:os.filter(o=>o.payment_status==='paid'&&['pending','confirmed','processing'].includes(o.fulfillment_status)).length,dest:'orders'},
   {name:'Respond to new messages',qty:qs.filter(q=>q.status==='new').length,dest:'inquiries'}
  ];
  for(const t of priorities){if(!t.qty)continue;const btn=document.createElement('button');btn.type='button';btn.className='overview-activity';const name=document.createElement('strong');name.textContent=t.name;const count=document.createElement('span');count.textContent=t.qty+' awaiting action';btn.append(name,count);btn.addEventListener('click',()=>navigate(t.dest));tasks.append(btn);}
  if(!tasks.children.length){const done=document.createElement('p');done.className='admin-hint';done.textContent='All caught up! No pending payments, fulfillment tasks, or new inquiries in the loaded records.';tasks.append(done);}
  const feed=$('overview-feed');feed.replaceChildren();
  const activity=[
   ...os.slice(0,6).map(o=>({when:o.created_at,title:'Order '+o.order_number,detail:(o.payment_status||'Unknown payment')+' · '+(o.fulfillment_status||'pending'),dest:'orders'})),
   ...qs.slice(0,6).map(q=>({when:q.created_at,title:'Customer inquiry',detail:(q.topic||'General')+' · '+(q.status||'new').replace('_',' '),dest:'inquiries'}))
  ].sort((a,b)=>new Date(b.when)-new Date(a.when)).slice(0,6);
  if(!activity.length){const empty=document.createElement('p');empty.textContent='No recent activity yet.';feed.append(empty);}
  for(const a of activity){const btn=document.createElement('button');btn.type='button';btn.className='overview-activity';const info=document.createElement('span');const title=document.createElement('strong');title.textContent=a.title;const detail=document.createElement('small');detail.textContent=a.detail;info.append(title,detail);const when=document.createElement('time');when.textContent=new Date(a.when).toLocaleDateString();btn.append(info,when);btn.addEventListener('click',()=>navigate(a.dest));feed.append(btn);}
 }catch(e){value('overview-status','Could not refresh overview: '+e.message);}finally{busy=false;}
}
function navigate(name){const tab=$('tab-'+name);if(tab)tab.click();}
function show(){for(const name of ['overview','products','analytics','inventory','inquiries','orders','reviews']){const tab=$('tab-'+name),panel=$(name+'-panel');if(tab){tab.classList.toggle('active',name==='overview');tab.setAttribute('aria-selected',String(name==='overview'));}if(panel)panel.hidden=name!=='overview';}load();}
document.addEventListener('DOMContentLoaded',()=>{
 $('tab-overview').addEventListener('click',show);$('overview-refresh').addEventListener('click',load);
 document.querySelectorAll('[data-overview-link]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.overviewLink)));
 window.JaniksOverview={init(c){client=c;show();},clear(){client=null;['overview-visitors-today','overview-visitors-month','overview-visitors-all','overview-revenue','overview-month-revenue','overview-paid-orders','overview-orders','overview-inquiries','overview-products'].forEach(k=>value(k,'—'));value('overview-status','');}};
 window.addEventListener('focus',()=>{if(client&&!$('overview-panel').hidden)load();});
});
})();