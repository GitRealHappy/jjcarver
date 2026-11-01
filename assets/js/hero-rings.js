(function () {
  var hero = document.querySelector('.hero');
  var rings = document.querySelectorAll('.hero__ring');
  if (!hero || !rings.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var depths = Array.prototype.map.call(rings, function (ring) {
    return parseFloat(ring.getAttribute('data-depth')) || 0;
  });

  var heroHeight = hero.offsetHeight;
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.pageYOffset;
    if (y > heroHeight) return;
    var range = window.innerWidth <= 768 ? 0.5 : 1;
    for (var i = 0; i < rings.length; i++) {
      rings[i].style.transform = 'translateY(' + (y * depths[i] * range).toFixed(2) + 'px)';
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    heroHeight = hero.offsetHeight;
    onScroll();
  });
  update();
})();
