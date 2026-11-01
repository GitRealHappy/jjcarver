# jjcarver: jessejamescarver.com

Personal landing page for Jesse James Carver: a hero, a short bio, and a conveyor of offers (event, course, wood art, podcast, letters, community, coaching). Static HTML/CSS/JS, no build step, deployed via GitHub Pages from `main` (root).

## Writing rules for this project (Claude: read before editing any copy)

- **Never use the word "quiet" or its variants** (quietly, quietness, etc.). It's overused in AI-generated writing and has become a tell. Find another word that's specific to the sentence instead of reaching for it as a default descriptor of restraint, calm, or subtlety.
- **Never use em dashes.** That means never use the character "—" anywhere in copy. Rewrite with a period, comma, colon, or parentheses instead. This includes en dashes used as a substitute when they're standing in for an em dash.
- These rules apply to all copy on this site: headlines, body text, meta descriptions, alt text, and any future sales copy.

## Structure

- `index.html`: single page with hero, bio, offers conveyor, and footer
- `assets/css/main.css`: all styling, no CSS framework
- `assets/js/conveyor.js`: clones the offer cards to fill the viewport and sets the loop distance and speed
- `assets/js/hero-rings.js`: scroll parallax for the hero rings
- `assets/images/`: hero-bg.jpg, jesse-bio.jpg
- `assets/card-images/`: photos for offer cards, JPEG at about 800px tall (see below)
- `CNAME`: custom domain for GitHub Pages

## Adding or editing an offer

Offers are `<a class="poster">` cards inside `.conveyor__track` in `index.html`. Copy an existing card, change the link and text, and the conveyor picks it up. For a photo card, add `poster--photo` and set `style="--poster-img: url('/assets/card-images/name.jpg');"` (use the leading slash: the URL resolves relative to the stylesheet, not the page. Drop the `<svg class="poster__rings">`.) Set `--poster-pos` (for example `40% 50%`) to choose which part of a wide photo shows in the tall card. Resize new photos to about 800px tall and save as JPEG first: `sips -s format jpeg -s formatOptions 78 --resampleHeight 800 in.png --out out.jpg`.
