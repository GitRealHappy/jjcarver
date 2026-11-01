(function () {
  var SPEED = 38;          // base drift, px per second
  var BOOST_TAU = 0.5;     // seconds for a sideways-scroll boost to fade
  var BOOST_MAX = 1600;    // px per second
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function init(conveyor) {
    var track = conveyor.querySelector('.conveyor__track');
    var section = conveyor.closest('.offers') || document;
    var buttons = section.querySelectorAll('[data-conveyor-step]');
    var originals = Array.prototype.slice.call(track.children);
    var step = 0;
    var setWidth = 0;

    function measure() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var first = originals[0];
      var last = originals[originals.length - 1];
      step = first.offsetWidth + gap;
      setWidth = last.offsetLeft + last.offsetWidth + gap - first.offsetLeft;
    }

    // Reduced motion: no drift, the row scrolls natively and the buttons page it.
    if (reduced) {
      measure();
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          conveyor.scrollBy({ left: Number(btn.getAttribute('data-conveyor-step')) * step });
        });
      });
      window.addEventListener('resize', measure);
      return;
    }

    var x = 0;               // distance the track has travelled left
    var boost = 0;           // extra px/s from sideways scrolling or a fling
    var pending = 0;         // distance still to cover for a button press
    var scale = 1;           // 1 = drifting, 0 = paused
    var paused = false;
    var drag = null;
    var suppressClick = false;
    var last = null;

    function build() {
      Array.prototype.forEach.call(track.querySelectorAll('[data-clone]'), function (el) {
        el.remove();
      });
      measure();
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
    }

    function render() {
      x = ((x % setWidth) + setWidth) % setWidth;
      track.style.transform = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)';
    }

    function frame(now) {
      var dt = last === null ? 0 : Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!drag || !drag.moved) {
        scale += ((paused ? 0 : 1) - scale) * Math.min(1, dt * 6);
        var move = (SPEED * scale + boost) * dt;
        boost *= Math.exp(-dt / BOOST_TAU);
        if (Math.abs(boost) < 1) boost = 0;
        var eased = pending * Math.min(1, dt * 8);
        pending -= eased;
        x += move + eased;
        render();
      }
      window.requestAnimationFrame(frame);
    }

    // Pause while the pointer or keyboard focus is on the cards.
    conveyor.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') paused = true;
    });
    conveyor.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse') paused = false;
    });
    conveyor.addEventListener('focusin', function () { paused = true; });
    conveyor.addEventListener('focusout', function () { paused = false; });

    // Sideways scroll (trackpad or shift+wheel) moves the row and adds a boost.
    conveyor.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      x += e.deltaX;
      boost = clamp(boost + e.deltaX * 3, -BOOST_MAX, BOOST_MAX);
    }, { passive: false });

    // Drag or swipe, with a fling on release.
    conveyor.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { id: e.pointerId, startX: e.clientX, lastX: e.clientX, lastT: e.timeStamp, vel: 0, moved: false };
    });

    conveyor.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.startX) < 6) return;
        drag.moved = true;
        pending = 0;
        try { conveyor.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
        conveyor.classList.add('is-dragging');
      }
      var dx = e.clientX - drag.lastX;
      var dtMs = e.timeStamp - drag.lastT;
      if (dtMs > 0) drag.vel = drag.vel * 0.5 + (-dx / dtMs * 1000) * 0.5;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
      x -= dx;
      render();
    });

    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) {
        boost = clamp(drag.vel, -BOOST_MAX, BOOST_MAX);
        suppressClick = true;
        conveyor.classList.remove('is-dragging');
      }
      drag = null;
    }
    conveyor.addEventListener('pointerup', endDrag);
    conveyor.addEventListener('pointercancel', endDrag);

    conveyor.addEventListener('click', function (e) {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick = false;
      }
    }, true);

    conveyor.addEventListener('dragstart', function (e) { e.preventDefault(); });

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        pending += Number(btn.getAttribute('data-conveyor-step')) * step;
      });
    });

    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        build();
        render();
      }, 150);
    });

    build();
    render();
    window.requestAnimationFrame(frame);
  }

  document.querySelectorAll('.conveyor').forEach(init);
})();
