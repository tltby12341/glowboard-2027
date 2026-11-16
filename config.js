/* =====================================================================
   GLOWBOARD CONFIG: the only file you need to edit to turn on payments.
   ===================================================================== */
window.GLOWBOARD_CONFIG = {
  // 1) Paste your payment link (Gumroad / Lemon Squeezy / Stripe Payment Link / Ko-fi shop).
  //    Leave empty to show a "Join the Pro waitlist" email button instead.
  PRO_PAYMENT_URL: "https://qiny.gumroad.com/l/glowboard-pro",
  PRO_PRICE_LABEL: "$4.99",

  // 2) In your payment product settings, set the redirect / thank-you URL to:
  //       https://tltby12341.github.io/glowboard-2027/?unlock=YOUR_SECRET_CODE
  //    then open /unlock-helper.html, type YOUR_SECRET_CODE, and paste the SHA-256 result below.
  UNLOCK_CODE_SHA256: "dd69ed182547ee8ebba68f21560cd9c84b58251f9f05709f0fdb4265202a9eed",

  TIP_URL: "",

  // 4) Your contact email (shown in footer, used for waitlist + refunds)
  CONTACT_EMAIL: "qiny0015@gmail.com",

  // 5) Optional extra analytics script src (Plausible / Umami). Leave empty for none.
  //    GoatCounter is included as a static <script> on every HTML page (do not
  //    also set ANALYTICS_SNIPPET_URL to count.js, or pageviews will double-count).
  ANALYTICS_SNIPPET_URL: "",
  ANALYTICS_DOMAIN: ""
};
