Implement a visual redesign of the homepage (`index.html` + `assets/css/main.css`) for a one-on-one social mentorship site ("The Influential Introvert" by Jesse James Carver). The site is currently a clean, restrained dark-mode editorial design that works but underplays its own impact — the goal is to make it more visually striking through higher contrast, larger/bolder type, and one signature motion element, without turning it busy or gimmicky.

## Current state (read before changing anything)

- `index.html` — full page markup, semantic sections: `.hero`, `.bio`/`#story`, `.sales`/`#program` (long-form persuasive copy in `.sales__section` blocks), `.testimonials`, a second `.sales` block with FAQ/CTA, `.site-footer`, plus a promo banner and a waitlist modal with existing JS.
- `assets/css/main.css` — all styling, vanilla CSS, no framework, no build step. Design tokens live in `:root` at the top.
- No JS framework or bundler anywhere in the repo — keep it that way. Any new interaction (parallax) should be plain vanilla JS, ideally a small `<script>` block near the bottom of `index.html` alongside the existing waitlist-modal script, matching that code's style (IIFE, no dependencies).
- Fonts already loaded: Fraunces (variable, optical size axis 9..144, weights 400/500/600) for display, Inter for body. Do not add new font weights/families unless truly necessary — Fraunces' optical-size axis already gives room for a light/heavy contrast pair without new font-loads.
- Current tokens:
  ```css
  --color-bg: #0d0c0a;
  --color-bg-alt: #151310;
  --color-text: #ece7df;
  --color-text-dim: #a8a098;
  --color-accent: #c9a24b;
  --color-border: #2a2722;
  ```

## Why this direction (don't deviate from the underlying logic)

The copy is explicitly about *perception and attention* — where it lives in a room, how to move it ("I was learning to read where attention lives in a room and how to move it"), and later a magician's-thread motif in the "Invisible Threads" section. The redesign should visually embody that thesis, not decorate on top of it. That's the justification for the concentric-circles motif below — it's a metaphor made literal, not a generic background effect.

## Three approved changes, in priority order

### 1. Signature element: "Attention Rings"

Add a set of thin hairline concentric circles (SVG, `1px` stroke, low-opacity `--color-accent`, e.g. `rgba(201,162,75,0.12–0.25)` varying by ring) centered behind the hero headline, overflowing the viewport edges. As the user scrolls, each ring should translate vertically at a different rate (parallax — outer rings move slower/faster than inner ones) so the page feels like it's radiating outward from a focal point behind "The Influential Introvert" title.

Constraints:
- Respect `prefers-reduced-motion: reduce` — fall back to a static (non-parallaxing) ring arrangement.
- On mobile (`max-width: 768px`), simplify: either fewer rings, reduced parallax range, or fully static — test that it doesn't fight with the existing mobile hero layout (`.hero__bg` becomes a fixed-height block on mobile, see the existing `@media (max-width: 768px)` block).
- This should be the *only* place rings appear at full strength. Optionally let a single partial ring peek from a corner near "The Invisible Threads" section (`.sales__method`) as a quiet callback — do not repeat the motif throughout the page or it stops being a signature and becomes wallpaper.
- Rings must not obscure text legibility or interfere with the existing `.hero__overlay` gradient — layer order matters (rings behind text, likely between `.hero__bg` and `.hero__content`, or blended with the overlay).
- Use plain SVG + CSS transforms driven by a scroll listener (rAF-throttled) or `will-change: transform` — no animation libraries.

### 2. Type scale — push it much larger, add a weight contrast within the hero title

- `.hero__title`: increase from `clamp(2.75rem, 7vw, 5.5rem)` to roughly `clamp(3.5rem, 10vw, 8.5rem)`, tighten `line-height` to ~0.92.
- Give the two lines of the hero title ("The Influential" / "Introvert") different visual weight using Fraunces' optical-size/weight range already loaded (400/500/600) — e.g. the first line lighter/regular, "Introvert" heavier — so the title has internal hierarchy rather than being one uniform block. Don't change the actual words or line breaks.
- Apply the same "go bigger than feels safe" logic to `.sales__hook` (currently `clamp(1.8rem, 4vw, 2.6rem)`) — this is the strongest single line of copy on the page ("You are being outcompeted socially by men half as thoughtful as you.") and should be sized to match its rhetorical weight, likely `clamp(2.2rem, 5vw, 3.75rem)` territory. Check it doesn't overflow or look awkward at narrow widths — test at 375px, 768px, 1440px.
- Leave `.sales h3` and body copy sizes as-is; the goal is hero + hook impact, not inflating every heading.

### 3. Contrast rhythm — stop dimming everything uniformly

Right now nearly all body paragraphs use `--color-text-dim` (#a8a098), which flattens hierarchy — everything is medium-gray, nothing pops.

- Keep `--color-text-dim` for connective/transitional sentences.
- Promote the highest-impact sentences to full `--color-text` (#ece7df) or a slightly brighter near-white, specifically: sentences already wrapped in `<em>` in the HTML, the `.sales__hook`, and 1–2 key lines per `.sales__section` that carry the emotional turn (e.g. "Forget your envy, and become the envied." / "You don't have to feel ready. You have to be willing."). Use judgment reading each section — don't mechanically brighten the first sentence of every paragraph.
- Do this via a small utility class (e.g. `.sales__section p strong`, or an explicit `<span class="text-bright">`/similar) rather than changing the base `--color-text-dim` token globally, since the dim tone is still correct for most of the copy.
- Net effect should be visible light/dark rhythm scanning down the page, not a uniform brightening.

## Explicit non-goals / restraint guardrails

- Do not introduce a second accent color. One gold accent, used more confidently, is the brief — not a new palette.
- Do not add ring/circle motifs to every section — one strong instance in the hero, at most one quiet callback elsewhere.
- Do not rewrite or shorten any copy. This is a visual pass only.
- Do not add scroll-triggered fade-ins, reveal animations, or other motion beyond the ring parallax — one orchestrated motion idea, not scattered effects.
- Do not change section structure/class names unless required for the ring layering — this is a live site with an embedded Circle.so form script and a working waitlist modal; don't break either.
- Keep everything responsive down to 375px width and verify no horizontal scroll is introduced by the ring SVGs (use `overflow: hidden` on the hero container, which already exists).
- Preserve keyboard focus visibility and don't let decorative SVGs be focusable or announced by screen readers (`aria-hidden="true"` on the ring container).

## Verification before calling this done

- Load the page (this is a static site, open `index.html` directly or serve the directory) and visually check hero, the "You are being outcompeted..." hook, and one mid-page section at 375px, 768px, and 1440px widths.
- Scroll through the hero slowly and confirm the parallax rings move smoothly without jank, and stop moving (static) with `prefers-reduced-motion` simulated on.
- Confirm the promo banner, waitlist modal, and Circle.so embedded form still function unchanged.
