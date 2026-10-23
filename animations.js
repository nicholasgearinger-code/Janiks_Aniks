/* Gentle, accessible motion for Janiks Aniks */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var targets = document.querySelectorAll('main > section, .category-hub, .season-card, .card, .catalog-card, .product-detail, .pay-list li');
  targets.forEach(function(el){ el.classList.add('motion-ready'); });
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('motion-in');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:0.12, rootMargin:'0px 0px -35px 0px'});
    targets.forEach(function(el){ observer.observe(el); });
  } else {
    targets.forEach(function(el){ el.classList.add('motion-in'); });
  }
})();