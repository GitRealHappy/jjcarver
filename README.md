# jjcarver: jessejamescarver.com

Personal landing page for Jesse James Carver: a hero, a short bio, and a conveyor of offers (event, course, wood art, podcast, letters, community, coaching). Static HTML/CSS/JS, no build step, deployed via GitHub Pages from `main` (root).

## Writing rules for this project (Claude: read before editing any copy)

- **Never use the word "quiet" or its variants** (quietly, quietness, etc.). It's overused in AI-generated writing and has become a tell. Find another word that's specific to the sentence instead of reaching for it as a default descriptor of restraint, calm, or subtlety.
- **Never use em dashes.** That means never use the character "—" anywhere in copy. Rewrite with a period, comma, colon, or parentheses instead. This includes en dashes used as a substitute when they're standing in for an em dash.
- These rules apply to all copy on this site: headlines, body text, meta descriptions, alt text, and any future sales copy.

## Structure

- `index.html`: single page with hero, bio, offers (the Invitations section), and footer
- `assets/css/main.css`: all styling, no CSS framework. Ring corridor styles are scoped under `.corridor`
- `assets/js/corridor.js`: turns the Invitations section into a ring corridor, a 3D walk through a ring-shaped building drawn in thin lines (Three.js 0.160.0 from jsDelivr, pinned in the import map in `index.html`'s head). Page scroll drives it: the section grows tall, its stage sticks to the screen, and each card holds still for a stretch of scrolling before the corridor moves on. Scrolling through the section walks one full lap, so after the last card the first comes round again before the page moves on. Prev/next loop endlessly (from the last card, next glides on to the next card the short way round), and the dial and the "All invitations" list scroll the page to a card. Settings (ring size, colours, `SCROLL_PER_CARD`, `DWELL`, card distances) are at the top
- `assets/js/conveyor.js`: the fallback when the corridor can't run (visitor asked for reduced motion, no WebGL, or the library didn't load within 10 seconds). Clones the cards to fill the viewport, drifts the track, pauses on hover, and speeds up on sideways scroll, drag/swipe or the prev/next buttons (`SPEED` and `BOOST_*` at the top tune it). Add `?conveyor` to the address to see it
- `assets/js/hero-rings.js`: scroll parallax for the hero rings
- `assets/images/`: hero-bg.jpg, jesse-bio.jpg
- `assets/card-images/`: photos for offer cards, JPEG at about 800px tall (see below)
- `CNAME`: custom domain for GitHub Pages

## Adding or editing an offer

Offers are `<a class="poster">` cards inside `.conveyor__track` in `index.html`. Copy an existing card, change the link and text, and both the corridor and the conveyor pick it up. The corridor spaces the cards evenly around the ring in the order they appear, and the section grows by `SCROLL_PER_CARD` screens for each new card. For a photo card, add `poster--photo` and set `style="--poster-img: url('/assets/card-images/name.jpg');"` (use the leading slash: the URL resolves relative to the stylesheet, not the page. Drop the `<svg class="poster__rings">`.) Set `--poster-pos` (for example `40% 50%`) to choose which part of a wide photo shows in the tall card. Resize new photos to about 800px tall and save as JPEG first: `sips -s format jpeg -s formatOptions 78 --resampleHeight 800 in.png --out out.jpg`.
