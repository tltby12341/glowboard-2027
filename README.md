# Glowboard: a free 2027 vision board lock screen maker

Live: https://tltby12341.github.io/glowboard-2027/

Glowboard is a static site (plain HTML, CSS and JS) hosted on GitHub Pages. Users pick goals and an aesthetic, and the site renders a vision board collage on a canvas sized for an iPhone or Android lock screen. Everything runs in the browser, and user photos never leave the device.

## Business model
- **Free:** 3 aesthetics (Clean Girl, Coquette, Old Money) and iPhone/Android PNGs with a small "glowboard · make yours free" watermark. The watermark is the viral loop.
- **Pro ($4.99, one-time):** all 8 aesthetics, no watermark, Desktop 4K and A4 print sizes, and 30 daily affirmation lock screens.

## Turn on payments (about 15 minutes)
1. Create a digital product called "Glowboard Pro" priced at $4.99 on **Gumroad** (easiest, and works for sellers in China via PayPal payouts), **Lemon Squeezy**, or a **Stripe Payment Link**.
2. Make up a secret code, e.g. `GLOW-2027-x8k2`. Open `/unlock-helper.html` on the live site, type the code, and copy the SHA-256 it shows.
3. Edit `config.js`:
   - `PRO_PAYMENT_URL`: your product or checkout URL
   - `UNLOCK_CODE_SHA256`: the hash from step 2
   - `CONTACT_EMAIL`: your email address
4. In the product settings, set the post-purchase redirect, or put this link in the receipt or thank-you message:
   `https://tltby12341.github.io/glowboard-2027/?unlock=GLOW-2027-x8k2`
   Buyers who open that link (or type the code under "Already bought?") are unlocked in their browser.
5. Commit and push. GitHub Pages redeploys in about 1 minute.

> Note: this unlock is client-side (honor system). That is fine for a $5 impulse product. Change the code if it leaks. For stronger protection later, use license-key verification (Gumroad and Lemon Squeezy both provide license APIs) behind a small serverless function.

Test Pro without paying: add `?pro=preview` to the URL. Nothing is saved.

## Analytics (optional)
Set `ANALYTICS_SNIPPET_URL` (and `ANALYTICS_DOMAIN`) in `config.js` for Plausible or Umami. The app fires events: `download_click`, `download_ok`, `paywall_view`, `unlock_click`, `unlocked`, `theme`, `share_native`, `copy_link`.

---

# 中文说明

**开启收款（约 15 分钟）：**
1. 在 Gumroad（最简单，可以用 PayPal 提现到国内）、Lemon Squeezy 或 Stripe Payment Link 上新建一个 $4.99 的数字商品，名称为 "Glowboard Pro"。
2. 自己想一个解锁码，比如 `GLOW-2027-x8k2`。打开线上的 `/unlock-helper.html`，输入解锁码，复制页面算出的 SHA-256。
3. 修改 `config.js`：把收款链接填进 `PRO_PAYMENT_URL`，把哈希值填进 `UNLOCK_CODE_SHA256`，把你的邮箱填进 `CONTACT_EMAIL`。
4. 在商品设置里，把“付款后跳转链接”设为 `https://tltby12341.github.io/glowboard-2027/?unlock=你的解锁码`，或者把这个链接写进收据或感谢信。
5. 提交并推送代码，大约 1 分钟后 GitHub Pages 会自动更新。

在网址后面加 `?pro=preview` 可以预览 Pro 效果，不会保存解锁状态。
