(function () {
  'use strict';
  var config = window.JANIKS_SUPABASE_CONFIG || {};
  var configured = /^https:\/\//.test(config.projectUrl || '') && !!config.publishableKey && !/YOUR_|PLACEHOLDER/i.test(config.publishableKey);
  var el = function (id) { return document.getElementById(id); };
  var client = null, products = [], draggedId = null, extraPhotos = [];
  var $ = function (id) { return el(id); };
  var status = function (node, message, kind) { node.textContent = message || ''; node.className = 'admin-message' + (kind ? ' ' + kind : ''); };
  var escapeHTML = function (value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); }); };
  var slugify = function (value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); };
  var toProduct = function (row) { return {id:row.id,slug:row.slug,name:row.name,description:row.description||'',price:Number(row.price)||0,image_url:row.image_url||'',category:row.category,color:row.color||'',tags:Array.isArray(row.tags)?row.tags:[],available:row.available!==false,published:row.published===true,payment_url:row.payment_url||'',image_urls:Array.isArray(row.image_urls)?row.image_urls:[],sort_order:Number(row.sort_order)||0}; };

  function showOnly(id) {
    ['setup-warning','login-panel','access-denied','dashboard'].forEach(function (key) { $(key).hidden = key !== id; });
  }
  function currentProduct(id) { return products.find(function (p) { return p.id === id; }); }
  function updateStats() {
    $('stat-total').textContent = String(products.length);
    $('stat-published').textContent = String(products.filter(function (p) { return p.published; }).length);
    $('stat-drafts').textContent = String(products.filter(function (p) { return !p.published; }).length);
  }
  function filteredProducts() {
    var q = $('product-search').value.trim().toLowerCase(), category = $('filter-category').value, state = $('filter-status').value;
    return products.filter(function (p) {
      return (!q || (p.name + ' ' + p.slug).toLowerCase().includes(q)) &&
        (!category || p.category === category) &&
        (!state || (state === 'published' ? p.published : !p.published));
    }).sort(function (a,b) { return a.sort_order-b.sort_order || a.name.localeCompare(b.name); });
  }
  function renderProducts() {
    var list = $('product-list'), filtered = filteredProducts();
    list.replaceChildren();
    $('product-count').textContent = filtered.length + (filtered.length === 1 ? ' item' : ' items');
    $('empty-products').hidden = filtered.length !== 0;
    filtered.forEach(function (p) {
      var card = document.createElement('article');
      card.className = 'admin-product-card'; card.draggable = !$('product-search').value.trim() && !$('filter-category').value && !$('filter-status').value; card.dataset.id = p.id;
      var image = p.image_url ? '<img src="' + escapeHTML(p.image_url) + '" alt="' + escapeHTML(p.name) + '" loading="lazy">' : '<div class="no-photo" aria-label="No photo yet">♡</div>';
      card.innerHTML = image +
        '<h3>' + escapeHTML(p.name) + '</h3><p>₱' + p.price.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}) + '</p>' +
        '<div class="product-meta"><span class="product-pill">' + escapeHTML(p.category) + '</span><span class="product-pill ' + (p.published?'published':'') + '">' + (p.published?'Published':'Draft') + '</span>' +
        (p.available ? '' : '<span class="product-pill">Sold out</span>') + '</div>' +
        '<div class="product-actions"><button type="button" data-action="edit">Edit</button><button type="button" data-action="toggle">' + (p.published?'Unpublish':'Publish') + '</button></div>';
      card.addEventListener('click', function (event) {
        var action = event.target.closest('button'); if (!action) return;
        if (action.dataset.action === 'edit') openEditor(p.id);
        if (action.dataset.action === 'toggle') togglePublish(p);
      });
      card.addEventListener('dragstart', function (event) { draggedId = p.id; card.classList.add('dragging'); if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',p.id);} });
      card.addEventListener('dragend', function () { draggedId = null; card.classList.remove('dragging'); list.querySelectorAll('.drag-over').forEach(function(n){n.classList.remove('drag-over');}); });
      card.addEventListener('dragover', function (event) { event.preventDefault(); card.classList.add('drag-over'); });
      card.addEventListener('dragleave', function () { card.classList.remove('drag-over'); });
      card.addEventListener('drop', function (event) {
        event.preventDefault(); card.classList.remove('drag-over');
        var source = draggedId || (event.dataTransfer && event.dataTransfer.getData('text/plain'));
        if (!source || source === p.id) return;
        var visible = filteredProducts(), from = visible.findIndex(function(x){return x.id===source;}), to = visible.findIndex(function(x){return x.id===p.id;});
        if (from < 0 || to < 0) return;
        visible.splice(to,0,visible.splice(from,1)[0]);
        var others = products.filter(function(x){return !visible.some(function(v){return v.id===x.id;});});
        products = visible.concat(others).map(function(x,i){x.sort_order=(i+1)*10;return x;});
        renderProducts(); saveOrder();
      });
      list.appendChild(card);
    });
  }
  async function saveOrder() {
    status($('admin-message'),'Saving product order…');
    for (var i=0;i<products.length;i++) {
      var result = await client.from('products').update({sort_order:products[i].sort_order}).eq('id',products[i].id);
      if (result.error) { status($('admin-message'),'Could not save order: '+result.error.message,'error'); return; }
    }
    status($('admin-message'),'Product order saved ♡','success');
  }
  async function loadProducts() {
    status($('admin-message'),'Loading your products…');
    var result = await client.from('products').select('*').order('sort_order',{ascending:true}).order('name',{ascending:true});
    if (result.error) { status($('admin-message'),'Could not load products: '+result.error.message,'error'); return; }
    products = (result.data || []).map(toProduct); updateStats(); renderProducts();
    status($('admin-message'), products.length ? 'Your product studio is ready ♡' : 'Your catalog is empty. Add your first product when you are ready.','success');
  }
  function validExtraURL(url){
    return typeof url==='string' && /^https:\/\//i.test(url) && url.length<=2000;
  }
  function discardExtraObject(url){
    if(url&&url.startsWith('blob:'))URL.revokeObjectURL(url);
  }
  function resetExtraPhotos(){
    extraPhotos.forEach(function(item){if(item.preview&&item.file)discardExtraObject(item.preview);});
    extraPhotos=[];
    if($('product-extra-files'))$('product-extra-files').value='';
    if($('product-extra-url'))$('product-extra-url').value='';
    renderExtraPhotos();
  }
  function renderExtraPhotos(){
    var target=$('product-extra-preview');if(!target)return;
    target.replaceChildren();
    if(!extraPhotos.length){
      var empty=document.createElement('p');empty.className='admin-hint';empty.textContent='No additional photos yet.';
      target.append(empty);return;
    }
    extraPhotos.forEach(function(item,index){
      var row=document.createElement('div');row.className='ja-admin-gallery-item';
      var img=document.createElement('img');img.src=item.preview||item.url;img.alt='Gallery photo '+(index+1);img.loading='lazy';
      var label=document.createElement('span');label.textContent='Photo '+(index+2)+(item.file?' (new upload)':'');
      var buttons=document.createElement('div');buttons.className='ja-admin-gallery-actions';
      [['↑','Move photo earlier',-1],['↓','Move photo later',1],['×','Remove photo',null]].forEach(function(entry){
        var button=document.createElement('button');button.type='button';button.textContent=entry[0];button.setAttribute('aria-label',entry[1]+' '+(index+2));
        if(entry[2]===-1&&index===0)button.disabled=true;
        if(entry[2]===1&&index===extraPhotos.length-1)button.disabled=true;
        button.addEventListener('click',function(){
          if(entry[2]===null){if(item.file)discardExtraObject(item.preview);extraPhotos.splice(index,1);}
          else{var moved=extraPhotos.splice(index,1)[0];extraPhotos.splice(index+entry[2],0,moved);}
          renderExtraPhotos();
        });
        buttons.append(button);
      });
      row.append(img,label,buttons);target.append(row);
    });
  }
  function addExtraURLs(){
    var field=$('product-extra-url'),url=field.value.trim();
    if(!validExtraURL(url)){status($('form-message'),'Enter a valid HTTPS image URL.','error');return;}
    if(extraPhotos.length>=5){status($('form-message'),'You can add up to five additional photos.','error');return;}
    if(extraPhotos.some(function(item){return item.url===url;})){status($('form-message'),'That photo is already in the gallery.','error');return;}
    extraPhotos.push({url:url,preview:url});
    field.value='';status($('form-message'),'');renderExtraPhotos();
  }
  function addExtraFiles(files){
    var selected=Array.from(files||[]);if(!selected.length)return;
    if(extraPhotos.length+selected.length>5){status($('form-message'),'Maximum five additional photos per product.','error');return;}
    for(var i=0;i<selected.length;i++){
      if(!/^image\/(jpeg|png|webp)$/.test(selected[i].type)||selected[i].size>8*1024*1024){
        status($('form-message'),'All photos must be JPG, PNG or WebP and 8 MB or smaller.','error');return;
      }
    }
    selected.forEach(function(file){extraPhotos.push({file:file,preview:URL.createObjectURL(file)});});
    $('product-extra-files').value='';
    status($('form-message'),'');renderExtraPhotos();
  }
  function resetForm() {
    resetExtraPhotos();
    $('product-form').reset(); $('product-id').value=''; $('product-price').value='0.00'; $('product-available').checked=true;
    $('product-published').checked=false; $('product-image-url').value=''; $('product-image-file').value='';
    $('image-preview').innerHTML='<span>♡ Product preview</span>'; status($('form-message'),'');
  }
  function previewURL(url) {
    var preview=$('image-preview'); preview.replaceChildren();
    if (!url) { preview.textContent='♡ Product preview'; return; }
    var img=document.createElement('img'); img.src=url; img.alt='Product photo preview';
    img.onerror=function(){preview.textContent='Image could not be previewed. Check the URL.';}; preview.appendChild(img);
  }
  function openEditor(id) {
    resetForm(); var p=id?currentProduct(id):null;
    $('dialog-title').textContent=p?'Edit product':'Add a product';
    if(p){
      $('product-id').value=p.id; $('product-name-input').value=p.name; $('product-slug').value=p.slug;
      $('product-description-input').value=p.description; $('product-price').value=String(p.price);
      $('product-category').value=p.category; $('product-color').value=p.color;
      $('product-tags').value=p.tags.join(', '); $('product-image-url').value=p.image_url;
      $('product-payment-url').value=p.payment_url; $('product-available').checked=p.available;
      $('product-published').checked=p.published; previewURL(p.image_url);
      extraPhotos=(p.image_urls||[]).filter(validExtraURL).slice(0,5).map(function(url){return {url:url,preview:url};});renderExtraPhotos();
    }
    $('product-dialog').showModal();
  }
  async function uploadPhoto(file, slug) {
    if (!file) return $('product-image-url').value.trim();
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
    if (file.size > 8*1024*1024) throw new Error('Image must be 8 MB or smaller.');
    var ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    var path = slug + '/' + Date.now() + '.' + ext;
    var result = await client.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if (result.error) throw result.error;
    return client.storage.from('product-images').getPublicUrl(result.data.path).data.publicUrl;
  }
  async function uploadAdditionalPhoto(file,slug){
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024)throw new Error('Gallery photos must be JPG, PNG or WebP, up to 8 MB.');
    var ext=file.type==='image/jpeg'?'jpg':file.type.split('/')[1];
    var path=slug+'/gallery-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
    var result=await client.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(result.error)throw result.error;
    return client.storage.from('product-images').getPublicUrl(result.data.path).data.publicUrl;
  }
  async function saveProduct(event) {
    event.preventDefault(); var button=$('save-product'); button.disabled=true; status($('form-message'),'Saving product…');
    try {
      var name=$('product-name-input').value.trim(), slug=slugify($('product-slug').value || name);
      if(!name) throw new Error('Add a product name.');
      if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Use a URL slug with lowercase letters, numbers, and hyphens.');
      var price=Number($('product-price').value);
      if(!Number.isFinite(price)||price<0) throw new Error('Enter a valid non-negative price.');
      var image=await uploadPhoto($('product-image-file').files[0],slug);
      var galleryURLs=[];
      for(var n=0;n<extraPhotos.length;n++){
        var item=extraPhotos[n];
        var url=item.file?await uploadAdditionalPhoto(item.file,slug):item.url;
        if(!validExtraURL(url))throw new Error('Gallery photos require valid HTTPS URLs.');
        if(url!==image&&!galleryURLs.includes(url))galleryURLs.push(url);
      }
      var record={slug:slug,name:name,description:$('product-description-input').value.trim(),price:price,image_url:image,image_urls:galleryURLs,
        category:$('product-category').value,color:$('product-color').value,
        tags:$('product-tags').value.split(',').map(function(t){return t.trim().toLowerCase();}).filter(Boolean),
        available:$('product-available').checked,published:$('product-published').checked,
        payment_url:$('product-payment-url').value.trim(),sort_order:0};
      if(record.published && !record.image_url) throw new Error('Add a product photo before publishing.');
      if(record.published && price <= 0) throw new Error('Enter a price greater than zero before publishing.');
      if(record.image_url && !/^https:\/\//i.test(record.image_url) && !/^images\//i.test(record.image_url)) throw new Error('Use an HTTPS image URL or a local images/ path.');
      if(record.payment_url && !/^https:\/\//i.test(record.payment_url)) throw new Error('Payment URL must start with https://.');
      var id=$('product-id').value, result;
      if(id) { record.id=id; result=await client.from('products').update(record).eq('id',id); }
      else { record.sort_order=(products.reduce(function(max,p){return Math.max(max,p.sort_order);},0)+10); result=await client.from('products').insert(record); }
      if(result.error) throw result.error;
      $('product-dialog').close(); await loadProducts();
    } catch(error) { var message=error.message||'Could not save product.';if(/image_urls/i.test(message))message='Additional photo database column is missing. Run supabase/product-multi-photos.sql in the Supabase SQL Editor first. '+message;status($('form-message'),message,'error'); }
    finally { button.disabled=false; }
  }
  async function togglePublish(p) {
    var result=await client.from('products').update({published:!p.published}).eq('id',p.id);
    if(result.error) status($('admin-message'),'Could not update product: '+result.error.message,'error');
    else await loadProducts();
  }
  async function start() {
    if(!configured || !window.supabase || !window.supabase.createClient) { showOnly('setup-warning'); return; }
    client=window.supabase.createClient(config.projectUrl,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    $('login-form').addEventListener('submit',async function(event){
      event.preventDefault();
      var button=$('login-form').querySelector('button');
      button.disabled=true;
      status($('login-message'),'Signing in…');
      try {
        var result=await client.auth.signInWithPassword({
          email:$('email').value.trim(),
          password:$('password').value
        });
        if(result.error){
          // Supabase's Auth error message helps distinguish credentials, confirmation,
          // provider, and rate-limit issues without exposing passwords or tokens.
          status($('login-message'),'Sign-in failed: '+(result.error.message || 'Supabase rejected the login.') ,'error');
          return;
        }
        await routeSession(result.data.session);
      } catch(error) {
        status($('login-message'),'Could not reach Supabase. Check your connection and project URL, then try again. '+(error && error.message ? '('+error.message+')' : ''),'error');
      } finally {
        button.disabled=false;
      }
    });
    $('sign-out').addEventListener('click',signOut); $('denied-sign-out').addEventListener('click',signOut);
    $('new-product').addEventListener('click',function(){openEditor(null);}); $('empty-add').addEventListener('click',function(){openEditor(null);});
    $('close-dialog').addEventListener('click',function(){$('product-dialog').close();});
    $('cancel-edit').addEventListener('click',function(){$('product-dialog').close();});
    $('product-form').addEventListener('submit',saveProduct);
    $('product-extra-files').addEventListener('change',function(){addExtraFiles(this.files);});
    $('product-add-extra-url').addEventListener('click',addExtraURLs);
    $('product-name-input').addEventListener('input',function(){if(!$('product-id').value||!$('product-slug').dataset.touched)$('product-slug').value=slugify(this.value);});
    $('product-slug').addEventListener('input',function(){this.dataset.touched='true';});
    $('product-image-file').addEventListener('change',function(){var file=this.files[0];if(file)previewURL(URL.createObjectURL(file));});
    $('product-image-url').addEventListener('input',function(){if(!$('product-image-file').files[0])previewURL(this.value);});
    ['product-search','filter-category','filter-status'].forEach(function(id){$(id).addEventListener('input',renderProducts);$(id).addEventListener('change',renderProducts);});
    client.auth.onAuthStateChange(function(_event,session){if(_event==='SIGNED_OUT'){showOnly('login-panel');$('sign-out').hidden=true;}});
    var session=await client.auth.getSession(); if(session.error){showOnly('login-panel');return;}
    await routeSession(session.data.session);
  }
  async function routeSession(session) {
    if(!session){showOnly('login-panel');$('sign-out').hidden=true;return;}
    var result=await client.from('store_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
    if(result.error || !result.data){showOnly('access-denied');$('sign-out').hidden=false;return;}
    // This browser was authenticated AND confirmed in store_admins. Exclude its
    // future storefront visits and referral tallies; leave the flag in place
    // after sign-out so ordinary owner browsing doesn't count as customers.
    try {
      localStorage.setItem('ja-analytics-owner-excluded-v1','1');
      var exclusionNotice=$('owner-tracking-exclusion');
      if(exclusionNotice)exclusionNotice.textContent='✓ Your visits from this browser are excluded from future visitor and referral counts. Sign in to Store Manager on other browsers/devices to exclude those too.';
    } catch (error) {
      var exclusionNotice=$('owner-tracking-exclusion');
      if(exclusionNotice)exclusionNotice.textContent='⚠ This browser could not save owner tracking exclusion. Allow site storage, then sign in again.';
      console.warn('[Janiks analytics] Could not save owner exclusion on this browser.');
    }
    $('sign-out').hidden=false;showOnly('dashboard');if(window.JaniksInventory)window.JaniksInventory.init(client);await loadProducts();if(window.JaniksOverview)window.JaniksOverview.init(client);if(window.JaniksReviews)window.JaniksReviews.init(client);
  }
  async function signOut() { if(window.JaniksOverview)window.JaniksOverview.clear();if(window.JaniksReviews)window.JaniksReviews.clear(); await client.auth.signOut(); showOnly('login-panel');$('sign-out').hidden=true; }
  document.addEventListener('DOMContentLoaded',start);
})();
