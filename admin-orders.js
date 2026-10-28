(function(){
'use strict';
var client,orders=[],active=null,initialized=false;
var $=id=>document.getElementById(id);
var esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
var money=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
var date=v=>v?new Date(v).toLocaleString('en-PH'):'—';
var msg=(s,error)=>{$('orders-message').textContent=s;$('orders-message').className='admin-message'+(error?' error':'');};
function tabs(which){['products','orders','analytics'].forEach(n=>{$('tab-'+n).classList.toggle('active',n===which);$('tab-'+n).setAttribute('aria-selected',String(n===which));$(n+'-panel').hidden=n!==which;});if(which==='orders')load();if(which==='analytics'&&window.JaniksAnalytics)window.JaniksAnalytics.load();}
function render(){
 var q=$('order-search').value.trim().toLowerCase(),st=$('order-status-filter').value,pay=$('order-payment-filter').value;
 var filtered=orders.filter(o=>(!q||[o.order_number,o.customer_name,o.customer_email].join(' ').toLowerCase().includes(q))&&(!st||o.fulfillment_status===st)&&(!pay||o.payment_status===pay));
 $('order-stat-total').textContent=orders.length;
 $('order-stat-unpaid').textContent=orders.filter(o=>o.payment_status==='unpaid'||o.payment_status==='pending').length;
 $('order-stat-ready').textContent=orders.filter(o=>o.payment_status==='paid'&&['pending','confirmed','processing'].includes(o.fulfillment_status)).length;
 $('order-stat-revenue').textContent=money(orders.filter(o=>o.payment_status==='paid').reduce((a,o)=>a+Number(o.total||0),0));
 $('orders-list').replaceChildren();$('orders-empty').hidden=filtered.length!==0;
 filtered.forEach(o=>{var card=document.createElement('article');card.className='manager-order-card';card.innerHTML='<div><strong>'+esc(o.order_number)+'</strong><small>'+esc(date(o.created_at))+'</small></div><div><strong>'+esc(o.customer_name)+'</strong><small>'+esc(o.customer_email)+'</small></div><div><strong>'+money(o.total)+'</strong><small>Payment: '+esc(o.payment_status)+'</small></div><div><span class="product-pill">'+esc(o.fulfillment_status)+'</span></div><button type="button" class="admin-button secondary">View order</button>';card.querySelector('button').addEventListener('click',()=>open(o));$('orders-list').appendChild(card);});
}
async function load(){
 msg('Loading orders…');var r=await client.from('orders').select('id,order_number,created_at,customer_name,customer_email,customer_phone,shipping_address,shipping_method,shipping_fee,subtotal,total,currency,payment_status,fulfillment_status,tracking_number,courier,fulfillment_notes,customer_notes').order('created_at',{ascending:false}).limit(200);
 if(r.error){orders=[];render();msg('Orders are not available yet. Run supabase/orders.sql in the Supabase SQL Editor, then refresh. Details: '+r.error.message,true);return;}
 orders=r.data||[];render();msg(orders.length?'Showing the 200 most recent orders.':'No orders recorded yet. Checkout integration is still required.');
}
async function open(o){
 active=o;$('order-dialog-title').textContent=o.order_number;$('order-detail-message').textContent='Loading items…';
 var r=await client.from('order_items').select('product_name,quantity,unit_price,line_total').eq('order_id',o.id);
 var items=r.error?'<p>Could not load items: '+esc(r.error.message)+'</p>':(r.data||[]).map(i=>'<div class="order-item-row"><span>'+esc(i.product_name)+' × '+Number(i.quantity)+'</span><strong>'+money(i.line_total)+'</strong></div>').join('')||'<p>No items attached.</p>';
 var address=o.shipping_address||{};
 var addressText=typeof address==='object'?Object.values(address).filter(v=>typeof v==='string'&&v.trim()).join(', '):String(address);
 $('order-detail-content').innerHTML='<div class="order-detail-grid"><div><h3>Customer</h3><p>'+esc(o.customer_name)+'<br>'+esc(o.customer_email)+'<br>'+esc(o.customer_phone)+'</p><h3>Shipping</h3><p>'+esc(addressText||'No address')+'<br>'+esc(o.shipping_method||'No method')+'</p></div><div><h3>Payment</h3><p><strong>'+esc(o.payment_status)+'</strong> — payment verification is handled outside this editor.</p><h3>Totals</h3><p>Subtotal '+money(o.subtotal)+'<br>Shipping '+money(o.shipping_fee)+'<br><strong>Total '+money(o.total)+'</strong></p></div></div><h3>Items</h3>'+items+'<p><strong>Customer note:</strong> '+esc(o.customer_notes||'None')+'</p><div class="order-fields"><label>Fulfillment status<select id="detail-fulfillment"><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label><label>Courier<input id="detail-courier" maxlength="100"></label><label>Tracking number<input id="detail-tracking" maxlength="160"></label><label>Internal fulfillment notes<textarea id="detail-notes" rows="3" maxlength="2000"></textarea></label></div>';
 $('detail-fulfillment').value=o.fulfillment_status;$('detail-courier').value=o.courier||'';$('detail-tracking').value=o.tracking_number||'';$('detail-notes').value=o.fulfillment_notes||'';
 $('order-detail-message').textContent='';$('order-dialog').showModal();
}
async function save(){
 if(!active)return;
 var status=$('detail-fulfillment').value;
 if(['shipped','delivered'].includes(status)&&active.payment_status!=='paid'){ $('order-detail-message').textContent='Cannot mark an order shipped or delivered before verified payment.';return;}
 var btn=$('save-order-fulfillment');btn.disabled=true;$('order-detail-message').textContent='Saving…';
 var r=await client.from('orders').update({fulfillment_status:status,courier:$('detail-courier').value.trim(),tracking_number:$('detail-tracking').value.trim(),fulfillment_notes:$('detail-notes').value.trim()}).eq('id',active.id);
 btn.disabled=false;if(r.error){$('order-detail-message').textContent='Save failed: '+r.error.message;return;}
 $('order-dialog').close();await load();
}
document.addEventListener('DOMContentLoaded',function(){
 var cfg=window.JANIKS_SUPABASE_CONFIG||{};if(!/^https:\/\//.test(cfg.projectUrl||'')||!cfg.publishableKey||!window.supabase)return;
 client=window.supabase.createClient(cfg.projectUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 $('tab-products').addEventListener('click',()=>tabs('products'));$('tab-analytics').addEventListener('click',()=>tabs('analytics'));$('tab-orders').addEventListener('click',()=>tabs('orders'));
 $('refresh-orders').addEventListener('click',load);['order-search','order-status-filter','order-payment-filter'].forEach(id=>$(id).addEventListener('input',render));
 $('close-order-dialog').addEventListener('click',()=>$('order-dialog').close());$('save-order-fulfillment').addEventListener('click',save);
 // Share the owner session via the main admin controller, not a separate login.
 window.JaniksOrders={init:function(mainClient){client=mainClient;initialized=true;if(window.JaniksAnalytics)window.JaniksAnalytics.init(client);},clear:function(){orders=[];render();if(window.JaniksAnalytics)window.JaniksAnalytics.clear();}};
 client.auth.getSession().then(async function(r){if(!r.data.session)return;var user=r.data.session.user;var check=await client.from('store_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(!check.error&&check.data&&window.JaniksAnalytics)window.JaniksAnalytics.init(client);});
 client.auth.onAuthStateChange(function(event){if(event==='SIGNED_OUT'){if(window.JaniksAnalytics)window.JaniksAnalytics.clear();orders=[];}if(event==='SIGNED_IN'){setTimeout(async function(){var r=await client.auth.getUser();if(!r.data.user)return;var a=await client.from('store_admins').select('user_id').eq('user_id',r.data.user.id).maybeSingle();if(!a.error&&a.data&&window.JaniksAnalytics)window.JaniksAnalytics.init(client);},0);}});
});
})();