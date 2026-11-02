/* Ring corridor for the Invitations section.

   Turns the offer cards into a walk through a ring-shaped building drawn in
   thin lines. Page scroll drives it: the section is tall, its stage sticks to
   the screen, and scrolling through the section carries the camera around the
   ring from one card to the next. Each card holds still for a stretch of
   scrolling so it can be read, then the corridor glides on to the next.

   The cards are the same <a class="poster"> elements the conveyor uses, so
   adding a card to index.html adds it to the ring. If this can't start (no
   WebGL, reduced motion, the library didn't load), index.html falls back to
   the conveyor (conveyor.js). */

import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

/* SETTINGS: distances in metres */

const RING_RADIUS      = 140;     // centre of the ring to the middle of the corridor
const CORRIDOR_WIDTH   = 9;       // inner wall to outer wall
const CORRIDOR_HEIGHT  = 6;       // floor to ceiling
const EYE_HEIGHT       = 1.7;     // camera height above the floor

const RIB_COUNT        = 128;     // cross-ribs around the whole ring
const WINDOW_COUNT     = 128;     // openings in the inner wall around the whole ring
const OPENING_WIDTH    = 0.45;    // share of each window bay that is open (0 to 1)
const SILL_HEIGHT      = 0.45;    // bottom of each opening
const LINTEL_HEIGHT    = 5.1;     // top of each opening
const SEGMENTS_PER_RIB = 4;       // smoothness of the long curved lines

const FOG_NEAR         = 10;      // lines start fading here...
const FOG_FAR          = 520;     // ...and are gone here

const LINE_WIDTH         = 1;     // ordinary lines, in screen pixels
const OPENING_LINE_WIDTH = 1.6;   // edges of the inner-wall openings
const ACCENT_LINE_WIDTH  = 2;     // the gold frame at each card

const COLOURS = { bg: '#0d0c0a', line: '#5f5a52', bright: '#d6cfc5', accent: '#c9a24b' };

/* Scrolling */
const SCROLL_PER_CARD  = 0.7;     // screen heights of scrolling from one card to the next
const LEAD             = 0.3;     // extra travel before the first card and after the last, in cards
const DWELL            = 2.4;     // 1 = steady travel; higher = each card holds still for longer
const FOLLOW           = 0.16;    // seconds for the camera to catch up with the scroll (smooths wheel steps)

/* Cards */
const CARD_SIDE        = 2.4;     // metres from the centreline toward the outer wall
const CARD_HEIGHT      = 2.2;     // height of the card's centre
const READ_DIST        = 11;      // how far ahead a card sits while it's being read
const SHOW_FAR         = 46;      // cards fade in from this far ahead...
const FULL_FAR         = 28;      // ...are fully shown from here...
const FULL_NEAR        = 8;       // ...until here...
const HIDE_NEAR        = 3.5;     // ...and have faded out by here

const SWAY_YAW         = 3;       // degrees of look-around from the mouse
const SWAY_PITCH       = 2;

/* ===================================================================== */

const TAU = Math.PI * 2;
const R_IN = RING_RADIUS - CORRIDOR_WIDTH / 2;
const R_OUT = RING_RADIUS + CORRIDOR_WIDTH / 2;
const H = CORRIDOR_HEIGHT;
const CIRCUMFERENCE = TAU * RING_RADIUS;
const BAY = TAU / WINDOW_COUNT;
const HALF_OPEN = (BAY * OPENING_WIDTH) / 2;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const wrapAngle = (a) => ((a % TAU) + TAU) % TAU;
const wrapS = (s) => ((s % CIRCUMFERENCE) + CIRCUMFERENCE) % CIRCUMFERENCE;
// shortest signed distance along the ring from a to b
const ringDelta = (a, b) => {
  const d = wrapS(b - a);
  return d > CIRCUMFERENCE / 2 ? d - CIRCUMFERENCE : d;
};
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// 0 -> 1 with flat ends, so each card lingers before the corridor moves on
const dwell = (f) => { const a = f ** DWELL; return a / (a + (1 - f) ** DWELL); };

function inOpening(a) {
  a = wrapAngle(a);
  const centre = (Math.floor(a / BAY) + 0.5) * BAY;
  return Math.abs(a - centre) < HALF_OPEN;
}

/* Builds the ring as three sets of lines plus invisible depth-only
   surfaces. The surfaces hide lines behind solid walls, so the far side of
   the ring shows only through the openings. Lines and surfaces share one
   angle list so their corners match exactly and the lap has no seam. */
function buildRing(cardAngles) {
  const list = [];
  const n = RIB_COUNT * SEGMENTS_PER_RIB;
  for (let i = 0; i < n; i++) list.push((i / n) * TAU);
  for (let w = 0; w < WINDOW_COUNT; w++) {
    const c = (w + 0.5) * BAY;
    list.push(wrapAngle(c - HALF_OPEN), wrapAngle(c + HALF_OPEN));
  }
  list.sort((a, b) => a - b);
  const angles = [];
  for (const a of list) if (!angles.length || a - angles[angles.length - 1] > 1e-7) angles.push(a);
  if (TAU - angles[angles.length - 1] < 1e-7) angles.pop();
  const M = angles.length;
  const COS = angles.map(Math.cos);
  const SIN = angles.map(Math.sin);
  const at = (r, j, y) => [r * COS[j], y, r * SIN[j]];
  const atA = (r, a, y) => [r * Math.cos(a), y, r * Math.sin(a)];
  const midOpen = (j, k) => inOpening((angles[j] + (k ? angles[k] : TAU)) / 2);

  const thin = [], bright = [], accent = [], occ = [];
  const seg = (arr, p, q) => arr.push(p[0], p[1], p[2], q[0], q[1], q[2]);

  for (let j = 0; j < M; j++) {
    const k = (j + 1) % M;
    const open = midOpen(j, k);
    const run = (arr, r, y) => seg(arr, at(r, j, y), at(r, k, y));
    run(thin, R_IN, 0); run(thin, R_OUT, 0);
    run(thin, R_IN, H); run(thin, R_OUT, H);
    run(thin, RING_RADIUS - CORRIDOR_WIDTH / 6, 0);
    run(thin, RING_RADIUS + CORRIDOR_WIDTH / 6, 0);
    run(thin, RING_RADIUS - CORRIDOR_WIDTH / 6, H);
    run(thin, RING_RADIUS + CORRIDOR_WIDTH / 6, H);
    run(thin, R_OUT, 1.0);
    run(thin, R_OUT, LINTEL_HEIGHT);
    run(open ? bright : thin, R_IN, SILL_HEIGHT);
    run(open ? bright : thin, R_IN, LINTEL_HEIGHT);

    const quad = (r1, y1, r2, y2) => {
      const a = at(r1, j, y1), b = at(r2, j, y2), c = at(r2, k, y2), d = at(r1, k, y1);
      occ.push(...a, ...b, ...c, ...a, ...c, ...d);
    };
    quad(R_IN, 0, R_OUT, 0);
    quad(R_IN, H, R_OUT, H);
    quad(R_OUT, 0, R_OUT, H);
    if (open) { quad(R_IN, 0, R_IN, SILL_HEIGHT); quad(R_IN, LINTEL_HEIGHT, R_IN, H); }
    else quad(R_IN, 0, R_IN, H);
  }

  // one rectangle around the corridor's cross-section
  function rib(arr, a) {
    seg(arr, atA(R_IN, a, 0), atA(R_OUT, a, 0));
    seg(arr, atA(R_OUT, a, 0), atA(R_OUT, a, H));
    seg(arr, atA(R_IN, a, H), atA(R_OUT, a, H));
    if (inOpening(a)) {
      seg(arr, atA(R_IN, a, 0), atA(R_IN, a, SILL_HEIGHT));
      seg(arr, atA(R_IN, a, LINTEL_HEIGHT), atA(R_IN, a, H));
    } else {
      seg(arr, atA(R_IN, a, 0), atA(R_IN, a, H));
    }
  }
  for (let i = 0; i < RIB_COUNT; i++) rib(thin, ((i * SEGMENTS_PER_RIB) / n) * TAU);
  for (const a of cardAngles) rib(accent, a);
  for (let w = 0; w < WINDOW_COUNT; w++) {
    const c = (w + 0.5) * BAY;
    for (const a of [c - HALF_OPEN, c + HALF_OPEN]) seg(bright, atA(R_IN, a, SILL_HEIGHT), atA(R_IN, a, LINTEL_HEIGHT));
  }
  return { thin, bright, accent, occ };
}

function start() {
  const section = document.querySelector('.offers');
  const stage = section.querySelector('.offers__stage');
  const canvas = stage.querySelector('.corridor-canvas');
  const head = stage.querySelector('.offers__head');
  const nav = stage.querySelector('.offers__nav');
  const hud = stage.querySelector('.corridor-hud');
  const hint = stage.querySelector('.corridor-hint');
  const cards = Array.from(section.querySelectorAll('.conveyor__track > .poster'));
  const N = cards.length;
  if (!N) throw new Error('No cards found for the corridor');

  const SPACING = CIRCUMFERENCE / N;                 // metres between cards
  const P_MIN = -LEAD, P_MAX = N - 1 + LEAD;         // scroll progress, in cards

  /* Scene */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(COLOURS.bg);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLOURS.bg, FOG_NEAR, FOG_FAR);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 1000);

  const ring = buildRing(cards.map((_, i) => (i / N) * TAU));
  const occGeo = new THREE.BufferGeometry();
  occGeo.setAttribute('position', new THREE.Float32BufferAttribute(ring.occ, 3));
  const occluder = new THREE.Mesh(occGeo, new THREE.MeshBasicMaterial({
    colorWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  }));
  occluder.renderOrder = -1;
  scene.add(occluder);

  const lineMaterials = [];
  function addLines(arr, colour, width) {
    const geo = new LineSegmentsGeometry();
    geo.setPositions(arr);
    const mat = new LineMaterial({ color: colour, linewidth: width, fog: true });
    lineMaterials.push(mat);
    scene.add(new LineSegments2(geo, mat));
  }
  addLines(ring.thin, COLOURS.line, LINE_WIDTH);
  addLines(ring.bright, COLOURS.bright, OPENING_LINE_WIDTH);
  addLines(ring.accent, COLOURS.accent, ACCENT_LINE_WIDTH);

  /* Scroll position <-> place on the ring */
  function scrollSpan() {
    const top = section.getBoundingClientRect().top + window.scrollY;
    return { top, range: Math.max(1, section.offsetHeight - stage.offsetHeight) };
  }
  function progress() {
    const { top, range } = scrollSpan();
    return P_MIN + clamp((window.scrollY - top) / range, 0, 1) * (P_MAX - P_MIN);
  }
  function scrollTopFor(p) {
    const { top, range } = scrollSpan();
    return top + ((p - P_MIN) / (P_MAX - P_MIN)) * range;
  }
  function targetS(p) {
    const i = Math.floor(p);
    return wrapS((i + dwell(p - i)) * SPACING - READ_DIST);
  }

  /* Camera */
  const state = { s: 0, ready: false };
  const sway = { x: 0, y: 0, tx: 0, ty: 0 };
  const look = new THREE.Vector3();
  function placeCamera() {
    const theta = state.s / RING_RADIUS;
    const c = Math.cos(theta), s = Math.sin(theta);
    camera.position.set(RING_RADIUS * c, EYE_HEIGHT, RING_RADIUS * s);
    const yaw = (-sway.x * SWAY_YAW * Math.PI) / 180;
    const pitch = (-sway.y * SWAY_PITCH * Math.PI) / 180;
    // forward is the tangent; "right" points in toward the courtyard
    const fx = -s, fz = c, rx = -c, rz = -s;
    look.set(
      camera.position.x + fx * Math.cos(yaw) - rx * Math.sin(yaw),
      EYE_HEIGHT + Math.tan(pitch),
      camera.position.z + fz * Math.cos(yaw) - rz * Math.sin(yaw),
    );
    camera.lookAt(look);
  }
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    sway.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    sway.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
  });
  stage.addEventListener('pointerleave', () => { sway.tx = 0; sway.ty = 0; });

  /* Cards: pinned to points in the corridor, they grow and slide past as
     the camera approaches, then fade */
  const panels = cards.map((el, i) => {
    const a = (i / N) * TAU;
    return {
      el, s: wrapS(i * SPACING), shown: false,
      anchor: new THREE.Vector3(
        (RING_RADIUS + CARD_SIDE) * Math.cos(a), CARD_HEIGHT, (RING_RADIUS + CARD_SIDE) * Math.sin(a),
      ),
    };
  });
  const box = { w: 0, h: 0, cardW: 0, cardH: 0, top: 0, bottom: 0, maxScale: 1 };
  const v = new THREE.Vector3();
  function placeCards() {
    for (const p of panels) {
      const ahead = ringDelta(state.s, p.s);
      const alpha = smooth(SHOW_FAR, FULL_FAR, ahead) * smooth(HIDE_NEAR, FULL_NEAR, ahead);
      if (alpha <= 0.001) {
        if (p.shown) { p.el.style.opacity = 0; p.el.classList.remove('is-near'); p.shown = false; }
        continue;
      }
      v.copy(p.anchor).project(camera);
      const scale = box.maxScale * (0.55 + 0.45 * smooth(SHOW_FAR, FULL_NEAR, ahead));
      const hw = (box.cardW * scale) / 2, hh = (box.cardH * scale) / 2;
      // keep the card on screen and clear of the heading and the controls
      const x = clamp(((v.x + 1) / 2) * box.w, hw + 12, box.w - hw - 12);
      const lo = box.top + hh, hi = box.bottom - hh;
      const y = lo < hi ? clamp(((1 - v.y) / 2) * box.h, lo, hi) : (box.top + box.bottom) / 2;
      p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      p.el.style.opacity = alpha.toFixed(3);
      p.shown = true;
      p.el.classList.toggle('is-near', alpha > 0.5);
    }
  }

  /* Controls: the round dial, the list of invitations, prev/next, the hint */
  const SVG = 'http://www.w3.org/2000/svg';
  const dialPos = hud.querySelector('.corridor-dial__pos');
  const dialTicks = hud.querySelector('.corridor-dial__ticks');
  const where = hud.querySelector('.corridor-where');
  const menu = hud.querySelector('.corridor-menu');
  const list = hud.querySelector('.corridor-menu__list');
  const stepButtons = Array.from(nav.querySelectorAll('[data-conveyor-step]'));
  // ring angle -> point on the dial (0 at the top, clockwise = forward)
  const dialPoint = (a, r) => [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
  const pad = (n) => String(n).padStart(2, '0');
  const kindOf = (el) => (el.querySelector('.poster__kind') || {}).textContent || '';
  const titleOf = (el) => (el.querySelector('.poster__title') || {}).textContent || '';

  // Going to a card scrolls the page to that card's place, so the page,
  // the back button and the scrollbar all stay in step with the corridor.
  let lastGo = null;
  function goTo(i) {
    i = clamp(i, 0, N - 1);
    const top = scrollTopFor(i);
    lastGo = { i, top, time: performance.now() };
    window.scrollTo({ top, behavior: 'smooth' });
  }
  function step(dir) {
    let p = progress();
    // pressing again while the page is still gliding counts from where it's heading
    if (lastGo && performance.now() - lastGo.time < 1500 && Math.abs(window.scrollY - lastGo.top) > 2) p = lastGo.i;
    if (dir > 0 ? p >= N - 1 - 0.05 : p <= 0.05) return;     // nothing further that way
    goTo(dir > 0 ? Math.floor(p + 0.1) + 1 : Math.ceil(p - 0.1) - 1);
  }
  stepButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-disabled') === 'true') return;   // already at the first or last card
      step(Number(btn.getAttribute('data-conveyor-step')));
    });
  });

  cards.forEach((el, i) => {
    const a = (i / N) * TAU;
    const [x1, y1] = dialPoint(a, 33), [x2, y2] = dialPoint(a, 47), [hx, hy] = dialPoint(a, 40);
    const tick = document.createElementNS(SVG, 'line');
    tick.setAttribute('class', 'corridor-dial__tick');
    tick.setAttribute('x1', x1); tick.setAttribute('y1', y1);
    tick.setAttribute('x2', x2); tick.setAttribute('y2', y2);
    const hit = document.createElementNS(SVG, 'circle');
    hit.setAttribute('class', 'corridor-dial__hit');
    hit.setAttribute('cx', hx); hit.setAttribute('cy', hy); hit.setAttribute('r', 12);
    hit.addEventListener('click', () => goTo(i));
    dialTicks.append(tick, hit);

    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    const num = document.createElement('span');
    num.className = 'corridor-menu__num';
    num.textContent = pad(i + 1);
    const label = document.createElement('span');
    label.className = 'corridor-menu__label';
    label.innerHTML = '<span class="corridor-menu__kind"></span><span class="corridor-menu__title"></span>';
    label.firstChild.textContent = kindOf(el);
    label.lastChild.textContent = titleOf(el);
    btn.append(num, label);
    btn.addEventListener('click', () => { menu.open = false; goTo(i); });
    li.append(btn);
    list.append(li);

    // keyboard: tabbing onto a card that isn't in view travels to it
    el.addEventListener('focusin', () => { if (!el.classList.contains('is-near')) goTo(i); });
  });
  const skipItem = document.createElement('li');
  skipItem.innerHTML = '<a class="corridor-menu__skip" href="#site-footer">Skip past the invitations</a>';
  skipItem.firstChild.addEventListener('click', () => { menu.open = false; });
  list.append(skipItem);

  // close the list when tapping elsewhere
  document.addEventListener('pointerdown', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });

  let whereIndex = -1;
  let startP = null;
  function updateHud(p) {
    const [x, y] = dialPoint(state.s / RING_RADIUS, 40);
    dialPos.setAttribute('cx', x.toFixed(2));
    dialPos.setAttribute('cy', y.toFixed(2));
    let best = 0, bestD = Infinity;
    panels.forEach((q, i) => { const d = Math.abs(ringDelta(state.s + READ_DIST, q.s)); if (d < bestD) { bestD = d; best = i; } });
    if (best !== whereIndex) {
      whereIndex = best;
      where.innerHTML = '<span class="corridor-where__num"></span> <span class="corridor-where__kind"></span>';
      where.firstChild.textContent = `${pad(best + 1)} / ${pad(N)}`;
      where.lastChild.textContent = kindOf(cards[best]);
    }
    stepButtons.forEach((btn) => {
      const dir = Number(btn.getAttribute('data-conveyor-step'));
      btn.setAttribute('aria-disabled', String(dir < 0 ? p <= 0.05 : p >= N - 1 - 0.05));
    });
    if (startP === null) startP = p;
    else if (Math.abs(p - startP) > 0.2) hint.classList.add('is-gone');
  }

  /* Size */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    // keep a wide enough view on tall phone screens
    const needed = (2 * Math.atan(Math.tan((78 * Math.PI) / 360) / aspect) * 180) / Math.PI;
    camera.fov = clamp(needed, 62, 100);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    for (const m of lineMaterials) m.resolution.set(w, h);

    // the section is as tall as the scrolling it takes to walk past every card
    section.style.height = `${Math.round(h * (1 + (P_MAX - P_MIN) * SCROLL_PER_CARD))}px`;

    box.w = w; box.h = h;
    box.cardW = cards[0].offsetWidth; box.cardH = cards[0].offsetHeight;
    box.top = head.offsetTop + head.offsetHeight + 8;
    box.bottom = Math.min(hud.offsetTop, nav.offsetTop) - 12;
    box.maxScale = clamp(Math.min((box.bottom - box.top) / box.cardH, (w - 24) / box.cardW), 0.4, 1);
    dirty = true;
  }

  /* Only draw while the section is on screen, and only when something moved */
  let visible = false, dirty = true, last = null;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) dirty = true;
  }, { rootMargin: '100px 0px' }).observe(section);
  new ResizeObserver(resize).observe(stage);
  if (document.fonts) document.fonts.ready.then(resize);

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last === null ? 0.016 : Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible) return;

    const p = progress();                            // read layout before writing styles
    const target = targetS(p);
    if (!state.ready) { state.s = target; state.ready = true; dirty = true; }
    const d = ringDelta(state.s, target);
    if (Math.abs(d) > 1e-3) { state.s = wrapS(state.s + d * (1 - Math.exp(-dt / FOLLOW))); dirty = true; }
    else if (d !== 0) { state.s = target; dirty = true; }

    const k = 1 - Math.exp(-dt / 0.5);
    if (Math.abs(sway.tx - sway.x) + Math.abs(sway.ty - sway.y) > 1e-4) {
      sway.x += (sway.tx - sway.x) * k;
      sway.y += (sway.ty - sway.y) * k;
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;
    placeCamera();
    renderer.render(scene, camera);
    placeCards();
    updateHud(p);
  }

  document.documentElement.classList.add('corridor-ready');
  resize();
  requestAnimationFrame(frame);

  // handle for testing in the browser console
  window.__corridor = { state, progress, scrollTopFor, targetS, goTo, N, CIRCUMFERENCE, SPACING };
}

// index.html adds .corridor to <html> when it's worth trying; if the
// fallback already took over (slow network), stay out of the way.
if (document.documentElement.classList.contains('corridor')) {
  try {
    start();
  } catch (err) {
    console.error(err);
    document.documentElement.classList.remove('corridor-ready');
    if (window.corridorFallback) window.corridorFallback();
  }
}
