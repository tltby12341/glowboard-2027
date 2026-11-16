/* =====================================================================
   GLOWBOARD CONFIG: the only file you need to edit to turn on payments.
   这是唯一需要修改的文件，用来开启收款。
   ===================================================================== */
window.GLOWBOARD_CONFIG = {
  // 1) Paste your payment link (Gumroad / Lemon Squeezy / Stripe Payment Link / Ko-fi shop / 爱发电 ...)
  //    把你的收款链接粘贴到这里。留空时，按钮会显示“本周上线，先登记”（邮件登记）。
  PRO_PAYMENT_URL: "",
  PRO_PRICE_LABEL: "$4.99",

  // 2) In your payment product settings, set the redirect / thank-you URL to:
  //       https://tltby12341.github.io/glowboard-2027/?unlock=YOUR_SECRET_CODE
  //    then open /unlock-helper.html, type YOUR_SECRET_CODE, and paste the SHA-256 result below.
  //    在支付平台把“付款成功后跳转链接”设为上面的地址，再用 unlock-helper.html 算出 SHA-256 填到这里。
  UNLOCK_CODE_SHA256: "",

  // 3) Optional: tip jar link (Buy Me a Coffee / Ko-fi / 爱发电). Leave empty to hide.
  TIP_URL: "",

  // 4) Your contact email (shown in footer, used for waitlist + refunds)
  CONTACT_EMAIL: "hello@example.com",

  // 5) Optional analytics script src (Plausible / Umami / Cloudflare). Leave empty for none.
  ANALYTICS_SNIPPET_URL: "",
  ANALYTICS_DOMAIN: ""
};
