/* Shared product catalog.
   When Supabase is configured, published products are loaded from the managed database.
   Without configuration, the existing static catalog remains the fallback. */
window.JANIKS_PRODUCTS = window.JANIKS_PRODUCTS || [];
window.JANIKS_PRODUCTS_BY_SLUG = window.JANIKS_PRODUCTS_BY_SLUG || {};
(function () {
  'use strict';
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src; script.async = true;
      script.onload = resolve; script.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(script);
    });
  }
  function setProducts(rows) {
    window.JANIKS_PRODUCTS = (rows || []).map(function (row) {
      return {
        id: row.id, slug: row.slug, name: row.name, description: row.description || '',
        price: Number(row.price) || 0, image: row.image_url || '', category: row.category,
        color: row.color || '', tags: Array.isArray(row.tags) ? row.tags : [],
        available: row.available === true, published: row.published === true,
        paymentUrl: row.payment_url || '', sortOrder: Number(row.sort_order) || 0
      };
    });
    window.JANIKS_PRODUCTS_BY_SLUG = Object.fromEntries(window.JANIKS_PRODUCTS.map(function (p) { return [p.slug, p]; }));
    return window.JANIKS_PRODUCTS;
  }
  function useStaticCatalog() {
    window.JANIKS_PRODUCTS_BY_SLUG = Object.fromEntries((window.JANIKS_PRODUCTS || []).map(function (p) { return [p.slug, p]; }));
    return window.JANIKS_PRODUCTS;
  }
  window.JANIKS_PRODUCTS_READY = (async function () {
    try {
      if (!window.JANIKS_SUPABASE_CONFIG) await loadScript('supabase-config.js');
      var config = window.JANIKS_SUPABASE_CONFIG || {};
      if (!/^https:\/\//.test(config.projectUrl || '') || !config.publishableKey || /YOUR_|PLACEHOLDER/i.test(config.publishableKey)) return useStaticCatalog();
      if (!window.supabase || !window.supabase.createClient) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      if (!window.supabase || !window.supabase.createClient) return useStaticCatalog();
      var client = window.supabase.createClient(config.projectUrl, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      var result = await client.from('products').select('id,slug,name,description,price,image_url,category,color,tags,available,published,payment_url,sort_order').eq('published', true).order('sort_order', { ascending: true }).order('name', { ascending: true });
      if (result.error) {
        console.warn('Janiks Aniks catalog could not load from Supabase; using the static fallback.', result.error.message);
        return useStaticCatalog();
      }
      return setProducts(result.data || []);
    } catch (error) {
      console.warn('Janiks Aniks catalog setup is incomplete; using the static fallback.', error && error.message);
      return useStaticCatalog();
    }
  })();
})();
