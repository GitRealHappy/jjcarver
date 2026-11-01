(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tracks = document.querySelectorAll('.conveyor__track');
  if (reduced || !tracks.length) return;

  var SPEED = 38; // px per second

  function build(track, originals) {
    Array.prototype.forEach.call(track.querySelectorAll('[data-clone]'), function (el) {
      el.remove();
    });

    var last = originals[originals.length - 1];
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    var setWidth = last.offsetLeft + last.offsetWidth + gap - originals[0].offsetLeft;
    var sets = Math.ceil(window.innerWidth / setWidth) + 1;

    for (var s = 1; s < sets; s++) {
      originals.forEach(function (el) {
        var clone = el.cloneNode(true);
        clone.setAttribute('data-clone', '');
        clone.setAttribute('aria-hidden', 'true');
        clone.tabIndex = -1;
        track.appendChild(clone);
      });
    }

    track.style.setProperty('--shift', setWidth + 'px');
    track.style.setProperty('--dur', (setWidth / SPEED).toFixed(1) + 's');
  }

  tracks.forEach(function (track) {
    var originals = Array.prototype.slice.call(track.children);
    var timer;
    build(track, originals);
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { build(track, originals); }, 150);
    });
  });
})();
