# Glowboard: a free 2027 vision board lock screen maker

Live: https://glowboard.quantworlds.com/

Glowboard is a static site (plain HTML, CSS and JS) hosted on Cloudflare Pages at [glowboard.quantworlds.com](https://glowboard.quantworlds.com/). The preview URL is `https://glowboard-2027.pages.dev`. Users pick goals and an aesthetic, and the site renders a vision board collage on a canvas sized for an iPhone or Android lock screen. Everything runs in the browser, and user photos never leave the device.

## Business model
- **Free:** 3 aesthetics (Clean Girl, Coquette, Old Money) and iPhone/Android PNGs with a small "glowboard · make yours free" watermark. The watermark is the viral loop.
- **Pro ($4.99, one-time):** all 18 aesthetics, no watermark, Desktop 4K, iPad and A4 print sizes, 30 daily affirmation lock screens, a matching (blurred) home screen, a printable A4 2027 goals checklist, and a one-tap "2027 set" .zip that includes a 5-tile widget pack.

## Features
- 18 looks (3 free, 15 Pro), 19 goal categories with 152 affirmations, and 11 one-tap "quick start" vibes.
- Title styles (Serif, Script, Bold, Handwritten), tap-to-swap photos, and your own photos (kept on the device).
- Sizes: iPhone, Android, IG/TikTok story (free); Desktop 4K, iPad, Print A4 (Pro).
- iPhone-safe saving: Save to Photos via the share sheet, with long-press guidance in in-app browsers.
- Gifting: a free "design a board for a friend" link opens a "Someone made you a 2027 board" reveal card. Gift Pro uses the Gumroad gift checkout.
- Tasteful nudges, shown once per session and never to Pro users: an upgrade card after a free save, and a desktop exit-intent reminder.
- Mobile: the looks are shown as a 2-row swipeable shelf.
- Shareable template links: `?b=<base64url JSON>` rebuilds a board. Deep links: `?look=<themeId>` and `?goals=travel,money`.
- SEO: `/ideas/` hub, 18 aesthetic landing pages, 5 topic pages (ideas for women, manifestation lock screen, 2027 goals list, free template, gift), a 152-affirmation page and 2 guides. Each has JSON-LD and its own OG image. The sitemap lists 28 URLs.

## Turn on payments (about 15 minutes)
1. Create a digital product called "Glowboard Pro" priced at $4.99 on **Gumroad** (easiest), **Lemon Squeezy**, or a **Stripe Payment Link**.
2. Make up a secret code, e.g. `GLOW-2027-x8k2`. Open `/unlock-helper.html` on the live site, type the code, and copy the SHA-256 it shows.
3. Edit `config.js`:
   - `PRO_PAYMENT_URL`: your product or checkout URL
   - `UNLOCK_CODE_SHA256`: the hash from step 2
   - `CONTACT_EMAIL`: your email address
4. In the product settings, set the post-purchase redirect, or put this link in the receipt or thank-you message:
   `https://glowboard.quantworlds.com/?unlock=GLOW-2027-x8k2`
   Buyers who open that link (or type the code under "Already bought?") are unlocked in their browser.
5. Commit your changes, then deploy:

   ```bash
   ./scripts/deploy.sh
   ```

   That uploads the site to Cloudflare Pages. The old GitHub Pages URL (`https://tltby12341.github.io/glowboard-2027/…`) is a redirect to the new domain and keeps the path, query string (`?unlock=…`) and hash.

> Note: this unlock is client-side (honor system). That is fine for a $5 impulse product. Change the code if it leaks. For stronger protection later, use license-key verification (Gumroad and Lemon Squeezy both provide license APIs) behind a small serverless function.

Test Pro without paying: add `?pro=preview` to the URL. Nothing is saved.


## Hosting and deploys

- **Live site:** [https://glowboard.quantworlds.com/](https://glowboard.quantworlds.com/) (Cloudflare Pages project `glowboard-2027`, custom domain on `quantworlds.com`).
- **Source of truth:** the `main` branch. This is the real site. Deploy it with `./scripts/deploy.sh` (requires a logged-in [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI). The script copies the site into a temp folder, leaving out `.git`, `node_modules`, `tools` and `scripts`.
- **Old GitHub Pages URL:** the `gh-pages` branch is a set of lightweight HTML redirects, not the app. GitHub Pages is set to publish that branch. Rebuild the stubs after adding or renaming pages:

  ```bash
  git checkout gh-pages
  # or, from a worktree:
  ./scripts/build-gh-pages-redirects.sh /path/to/gh-pages
  ```

  Then commit and push `gh-pages`. Do not deploy `gh-pages` to Cloudflare.

## Analytics (optional)
Set `ANALYTICS_SNIPPET_URL` (and `ANALYTICS_DOMAIN`) in `config.js` for Plausible or Umami. The app fires events: `download_click`, `download_ok`, `paywall_view` (with `reason`), `paywall_style`, `unlock_click`, `unlocked`, `theme`, `vibe`, `title_font`, `photo_swap`, `more_goals`, `template_share`, `template_open`, `look_open`, `checklist_click`, `checklist_ok`, `home_click`, `home_ok`, `share_native`, `copy_link`, `save_image`, `set_click`, `set_ok`, `gift_pro_click`, `gift_free_click`, `nudge_view`, `nudge_click`, `nudge_dismiss`, `reveal_save`, `reveal_edit`.

Not enabled yet: every privacy-friendly option (Plausible, Umami Cloud, GoatCounter, Cloudflare Web Analytics) needs an account. Once you have one, paste the script URL and domain into `config.js`. Nothing else needs to change.

