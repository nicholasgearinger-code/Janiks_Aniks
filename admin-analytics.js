(function(){
'use strict';
var client=null,orders=[],items=[],expenses=[],ready=false;
var $=id=>document.getElementById(id);
var fmt=n=>'₱'+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
var esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
var day=d=>new Date(d).toISOString().slice(0,10);
var status=s=>$('analytics-status').textContent=s;
function empty(id,s){$(id).innerHTML='<p class="admin-hint">'+esc(s)+'</p>';}
function chart(data,days){
 var host=$('sales-chart');host.replaceChildren();if(!data.length){empty('sales-chart','No paid sales recorded for this period.');return;}
 var max=Math.max(1,...data.map(d=>d.value));var w=700,h=230,p=38;
 var points=data.map((d,i)=>[p+i*(w-2*p)/Math.max(1,data.length-1),h-p-(d.value/max)*(h-2*p)]);
 var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.setAttribute('role','img');svg.setAttribute('aria-label','Verified sales: '+data.map(d=>d.label+' '+fmt(d.value)).join(', '));
 function node(tag,attrs,text){var e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!=null)e.textContent=text;svg.appendChild(e);}
 for(var i=0;i<=4;i++){var y=h-p-(h-2*p)*i/4;node('line',{x1:p,y1:y,x2:w-p,y2:y,stroke:'#ecd7de'});node('text',{x:2,y:y+4,'font-size':11,fill:'#876772'},Math.round(max*i/4).toLocaleString('en-PH'));}
 if(points.length>1)node('polyline',{points:points.map(v=>v.join(',')).join(' '),fill:'none',stroke:'#ad1738','stroke-width':3,'stroke-linejoin':'round'});
 points.forEach((pt,i)=>{node('circle',{cx:pt[0],cy:pt[1],r:3,fill:'#ad1738'});if(i===0||i===points.length-1||i%Math.max(1,Math.ceil(points.length/6))===0)node('text',{x:pt[0],y:h-10,'text-anchor':'middle','font-size':10,fill:'#876772'},data[i].label);});
 host.appendChild(svg);
}
function render(){
 var days=Number($('analytics-period').value),now=new Date(),start=new Date(now.getTime()-days*86400000);
 var period=orders.filter(o=>new Date(o.created_at)>=start&&new Date(o.created_at)<=now);
 var paid=period.filter(o=>o.payment_status==='paid'),sales=paid.reduce((s,o)=>s+Number(o.total||0),0);
 var exp=expenses.filter(e=>new Date(e.expense_date+'T12:00:00')>=start&&new Date(e.expense_date+'T12:00:00')<=now);
 var operating=exp.reduce((s,e)=>s+Number(e.amount||0),0);
 var paidIds=new Set(paid.map(o=>o.id)),paidItems=items.filter(i=>paidIds.has(i.order_id));
 var costsComplete=paidItems.length>0&&paidItems.every(i=>i.unit_cost!==null&&i.unit_cost!==undefined);
 var productCosts=costsComplete?paidItems.reduce((s,i)=>s+Number(i.unit_cost)*Number(i.quantity),0):0;
 $('a-sales').textContent=fmt(sales);$('a-orders').textContent=String(paid.length);$('a-aov').textContent='Average order '+(paid.length?fmt(sales/paid.length):'—');
 $('a-expenses').textContent=fmt(operating+(costsComplete?productCosts:0));
 $('a-profit').textContent=costsComplete?fmt(sales-operating-productCosts):'—';
 $('a-profit-note').textContent=costsComplete?'Estimate before unrecorded costs and taxes':'Add cost snapshots for every paid item to estimate profit';
 var counts={paid:0,pending:0,unpaid:0,refunded:0,failed:0};period.forEach(o=>{counts[o.payment_status]=(counts[o.payment_status]||0)+1;});
 $('order-breakdown').innerHTML=Object.entries(counts).map(([k,v])=>'<div class="metric-row"><span>'+esc(k)+'</span><strong>'+v+'</strong></div>').join('');
 var totals=new Map();paidItems.forEach(i=>{var k=i.product_name||'Unnamed product',v=totals.get(k)||{qty:0,revenue:0};v.qty+=Number(i.quantity||0);v.revenue+=Number(i.line_total||0);totals.set(k,v);});
 var top=[...totals.entries()].sort((a,b)=>b[1].qty-a[1].qty).slice(0,8);
 $('top-products').innerHTML=top.length?top.map(([k,v])=>'<div class="metric-row"><span>'+esc(k)+' <small>('+v.qty+' sold)</small></span><strong>'+fmt(v.revenue)+'</strong></div>').join(''):'<p class="admin-hint">No item-level sales recorded yet.</p>';
 var bins=new Map(),monthly=days===365;for(var i=days-1;i>=0;i--){var d=new Date(now.getTime()-i*86400000),key=monthly?day(d).slice(0,7):day(d);if(!bins.has(key))bins.set(key,0);}
 paid.forEach(o=>{var k=monthly?day(o.created_at).slice(0,7):day(o.created_at);if(bins.has(k))bins.set(k,bins.get(k)+Number(o.total||0));});
 chart([...bins].map(([k,v])=>({label:k.slice(5),value:v})),days);
 $('expense-list').innerHTML=exp.length?exp.slice(0,30).map(e=>'<div class="metric-row"><span>'+esc(e.expense_date)+' · '+esc(e.category)+(e.description?' — '+esc(e.description):'')+'</span><strong>'+fmt(e.amount)+'</strong><button type="button" data-expense="'+esc(e.id)+'" aria-label="Delete expense">×</button></div>').join(''):'<p class="admin-hint">No expenses recorded in this period.</p>';
 $('expense-list').querySelectorAll('button[data-expense]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Delete this expense record?'))return;var r=await client.from('business_expenses').delete().eq('id',b.dataset.expense);if(r.error){$('expense-message').textContent=r.error.message;return;}await load();}));
}
async function load(){
 if(!ready)return;status('Loading your business data…');
 var since=new Date(Date.now()-366*86400000).toISOString();
 var results=await Promise.all([client.from('orders').select('id,created_at,total,payment_status').gte('created_at',since).order('created_at',{ascending:false}).limit(5000),client.from('business_expenses').select('id,expense_date,category,description,amount').gte('expense_date',since.slice(0,10)).order('expense_date',{ascending:false}).limit(5000)]);
 if(results[0].error){status('Orders unavailable: '+results[0].error.message+' — run supabase/orders.sql first.');return;}
 if(results[1].error){status('Expenses unavailable: '+results[1].error.message+' — run supabase/analytics.sql first.');return;}
 orders=results[0].data||[];expenses=results[1].data||[];
 var ids=orders.map(o=>o.id);items=[];
 for(var n=0;n<ids.length;n+=100){var r=await client.from('order_items').select('order_id,product_name,quantity,line_total,unit_cost').in('order_id',ids.slice(n,n+100));if(r.error){status('Order item data unavailable: '+r.error.message);return;}items.push(...(r.data||[]));}
 render();status((orders.length===5000||expenses.length===5000?'Results may be incomplete (5,000-record limit). ':'')+'Showing recorded data. Payment verification and checkout integration are required for reliable sales.');
}
document.addEventListener('DOMContentLoaded',function(){
 $('analytics-refresh').addEventListener('click',load);$('analytics-period').addEventListener('change',render);
 $('expense-date').value=day(new Date());
 $('expense-form').addEventListener('submit',async e=>{e.preventDefault();if(!ready)return;var btn=e.target.querySelector('button');btn.disabled=true;
 var r=await client.from('business_expenses').insert({expense_date:$('expense-date').value,category:$('expense-category').value,amount:Number($('expense-amount').value),description:$('expense-description').value.trim()});
 btn.disabled=false;if(r.error){$('expense-message').textContent='Could not save: '+r.error.message;return;}e.target.reset();$('expense-date').value=day(new Date());$('expense-message').textContent='Expense recorded.';await load();});
 window.JaniksAnalytics={init:function(c){client=c;ready=true;},load:load,clear:function(){ready=false;orders=[];items=[];expenses=[];}};
});
})();