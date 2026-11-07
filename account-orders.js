/* Read-only customer order history. Supabase RLS restricts rows to the JWT owner. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const cfg=window.JANIKS_SUPABASE_CONFIG||{};
const money=n=>'₱'+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const prettyDate=d=>new Date(d).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
const payLabel={unpaid:'Awaiting payment',pending:'Payment verification pending',paid:'Payment verified',refunded:'Refunded',failed:'Payment unsuccessful'};
function fulfillment(order){
 if(order.fulfillment_status==='cancelled')return 'Cancelled';
 if(order.payment_status!=='paid')return 'Waiting for verified payment';
 switch(order.fulfillment_status){
  case 'confirmed': return 'Payment confirmed • awaiting store transfer';
  case 'processing': return 'Preparing for store pickup';
  case 'in_transit_to_store': return 'On the way to the pickup store';
  case 'ready_for_pickup': return 'Ready for pickup ♡';
  case 'collected': return 'Collected — thank you ♡';
  case 'shipped': return 'Transfer in progress (legacy status)';
  case 'delivered': return 'Delivery complete (legacy status)';
  default:return 'Payment verified • fulfillment pending';
 }
}
function node(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
document.addEventListener('DOMContentLoaded',()=>{
 const root=$('customer-orders-list'),message=$('customer-orders-message'),button=$('customer-orders-refresh'),home=$('account-home');
 if(!root||!message||!button||!home)return;
 if(!cfg.projectUrl||!cfg.publishableKey||!window.supabase){message.textContent='Order history is not configured.';return;}
 const db=window.supabase.createClient(cfg.projectUrl,cfg.publishableKey);
 let busy=false,lastUserId=null,lastLoaded=0,generation=0;
 function clear(){generation++;lastUserId=null;lastLoaded=0;root.replaceChildren();message.textContent='Sign in to view your order history.';}
 function card(order,items){
  const article=node('article','customer-order-card');
  const header=node('div','customer-order-header');
  const info=node('div');
  info.append(node('strong','',order.order_number),node('small','',prettyDate(order.created_at)));
  header.append(info,node('strong','customer-order-total',money(order.total)));
  const badges=node('div','customer-order-badges');
  badges.append(node('span','customer-order-pill',payLabel[order.payment_status]||'Payment status unavailable'));
  badges.append(node('span','customer-order-pill pickup-pill',fulfillment(order)));
  const list=node('ul','customer-order-items');
  items.forEach(i=>list.append(node('li','',i.product_name+' × '+i.quantity+' — '+money(i.line_total))));
  if(!items.length)list.append(node('li','','Item details unavailable'));
  const note=node('p','customer-order-note',order.fulfillment_status==='ready_for_pickup'&&order.payment_status==='paid'?'Your order has been marked ready for pickup. Bring your order number to the store.':order.fulfillment_status==='collected'?'Your order was marked collected. Thank you for shopping with us!':'Store pickup only. Please wait until your order is marked ready for pickup before visiting.');
  article.append(header,badges,list,note);
  return article;
 }
 async function load(force=false){
  if(home.hidden)return;
  if(busy)return;
  const current=++generation;
  busy=true;button.disabled=true;message.textContent='Loading your orders…';
  try{
   const auth=await db.auth.getUser();
   if(current!==generation)return;
   const user=auth.data?.user;
   if(!user){clear();return;}
   if(!force&&lastUserId===user.id&&Date.now()-lastLoaded<30000){message.textContent='Your order history is up to date.';return;}
   // Limited read-only fields: never expose address, email or other customer details.
   const orders=await db.from('orders')
    .select('id,order_number,created_at,total,payment_status,fulfillment_status')
    .eq('customer_user_id',user.id).order('created_at',{ascending:false}).limit(50);
   if(current!==generation)return;
   if(orders.error)throw orders.error;
   const rows=orders.data||[];
   let items=[];
   if(rows.length){
    const q=await db.from('order_items')
     .select('order_id,product_name,quantity,line_total')
     .in('order_id',rows.map(x=>x.id));
    if(q.error)throw q.error;
    items=q.data||[];
   }
   if(current!==generation)return;
   root.replaceChildren();
   rows.forEach(o=>root.append(card(o,items.filter(i=>i.order_id===o.id))));
   lastUserId=user.id;lastLoaded=Date.now();
   message.textContent=rows.length?('Showing '+rows.length+' most recent '+(rows.length===1?'order':'orders')+'. Payment verification and pickup readiness are separate stages.'):'No orders linked to this account yet. Once checkout is activated, your orders will appear here.';
  }catch(e){
   if(current!==generation)return;
   root.replaceChildren();
   message.textContent='Could not load orders. If this is a new setup, run supabase/customer-order-history.sql. '+(e?.message||'Please try again.');
  }finally{busy=false;button.disabled=false;}
 }
 button.addEventListener('click',()=>load(true));
 const watcher=new MutationObserver(()=>{if(home.hidden)clear();else load(true);});
 watcher.observe(home,{attributes:true,attributeFilter:['hidden']});
 db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){clear();}else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')setTimeout(()=>load(),0);});
 if(!home.hidden)load();
 window.addEventListener('focus',()=>{if(!home.hidden)load();});
});
})();