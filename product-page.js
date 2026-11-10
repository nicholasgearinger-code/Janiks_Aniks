/* Shared Janiks Aniks product template enhancements.
   Existing store.js owns cart state and add-to-cart; this file only decorates
   catalog-backed product pages, so no product data is duplicated in HTML. */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);};
  function peso(value){return '₱'+Number(value).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function verified(p){return !!p&&p.published===true&&p.available===true&&typeof p.slug==='string'&&p.image&&Number(p.price)>0;}
  function collection(p){
    var map={mugs:['Mugs','shop.html'],plushies:['Plushies','plushies.html'],
      accessories:['Stickers & accessories','accessories.html'],
      stickers:['Stickers','accessories.html'],figurines:['Figurines','figurines.html']};
    return map[p.category]||['Our collection','shop.html'];
  }
  function quantityButtons(){
    var input=$('quantity');
    if(!input)return;
    function clamp(){var n=parseInt(input.value,10);if(!Number.isFinite(n))n=1;input.value=String(Math.max(1,Math.min(99,n)));}
    $('quantity-minus')?.addEventListener('click',function(){clamp();input.value=String(Math.max(1,Number(input.value)-1));});
    $('quantity-plus')?.addEventListener('click',function(){clamp();input.value=String(Math.min(99,Number(input.value)+1));});
    input.addEventListener('change',clamp);
  }
  function createImage(src,alt){
    var img=document.createElement('img');img.src=src;img.alt=alt;img.loading='lazy';img.decoding='async';
    return img;
  }
  function gallery(p){
    var root=$('product-photo'),thumbnails=$('product-thumbnails');if(!root||!thumbnails)return;
    var urls=[p.image];
    // Additional images can be added later by catalog data; one image works now.
    if(Array.isArray(p.images))p.images.forEach(function(url){
      if(typeof url==='string'&&/^https:\/\//i.test(url)&&!urls.includes(url))urls.push(url);
    });
    root.replaceChildren();
    var main=createImage(urls[0],p.name);main.loading='eager';main.fetchPriority='high';
    root.appendChild(main);
    thumbnails.replaceChildren();
    thumbnails.hidden=urls.length<2;
    urls.slice(0,6).forEach(function(url,i){
      var btn=document.createElement('button');btn.type='button';btn.className='ja-product-thumb';
      btn.setAttribute('aria-label','View photo '+(i+1)+' of '+p.name);
      btn.setAttribute('aria-pressed',i===0?'true':'false');
      btn.appendChild(createImage(url,p.name+' photo '+(i+1)));
      btn.addEventListener('click',function(){
        main.src=url;main.alt=p.name+' photo '+(i+1);
        thumbnails.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',b===btn?'true':'false');});
      });thumbnails.appendChild(btn);
    });
  }
  function related(p,products){
    var root=$('product-related'),section=$('product-related-section');
    if(!root||!section)return;
    root.replaceChildren();
    var peers=(products||[]).filter(function(item){return item.slug!==p.slug&&verified(item)&&item.category===p.category;}).slice(0,2);
    section.hidden=peers.length===0;
    peers.forEach(function(item){
      var link=document.createElement('a');
      link.className='ja-related-product';
      link.href='product.html?slug='+encodeURIComponent(item.slug);
      link.appendChild(createImage(item.image,item.name));
      var copy=document.createElement('span');copy.className='ja-related-copy';
      var name=document.createElement('strong');name.textContent=item.name;
      var price=document.createElement('span');price.textContent=peso(item.price);
      copy.append(name,price);link.appendChild(copy);root.appendChild(link);
    });
  }
  function apply(){
    var slug=new URLSearchParams(location.search).get('slug');
    var product=(window.JANIKS_PRODUCTS_BY_SLUG||{})[slug];
    if(!verified(product))return;
    var group=collection(product);
    $('product-category-label').textContent=group[0];
    $('product-collection-link').textContent=group[0];
    $('product-collection-link').href=group[1];
    $('product-crumb').textContent=product.name;
    $('related-more-link').href=group[1];
    gallery(product);
    related(product,window.JANIKS_PRODUCTS||[]);
    // Product-specific ratings are deliberately hidden unless real numbers exist.
    var rating=$('product-rating'),score=Number(product.rating),count=Number(product.reviewCount);
    if(rating&&score>0&&score<=5&&count>0){
      rating.textContent='★ '+score.toFixed(1)+' ('+count+' '+(count===1?'review':'reviews')+')';
      rating.hidden=false;
    }
  }
  document.addEventListener('DOMContentLoaded',function(){
    if(!$('main-content')||!$('product-photo'))return;
    quantityButtons();
    Promise.resolve(window.JANIKS_PRODUCTS_READY).then(apply).catch(function(error){
      console.warn('[Janiks products] Template could not load',error&&error.message||error);
    });
  });
})();
