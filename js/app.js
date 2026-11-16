import { CATEGORIES, STRINGS, WORDS, AFFIRMATIONS } from './data.js';
import { THEMES, themeById } from './themes.js';
import { renderBoard, renderAffirmation, ensureFonts, SIZES, loadManifest } from './render.js';

const CFG = Object.assign({ PRO_PAYMENT_URL: '', PRO_PRICE_LABEL: '$4.99', UNLOCK_CODE_SHA256: '', TIP_URL: '', CONTACT_EMAIL: 'hello@example.com' }, window.GLOWBOARD_CONFIG || {});
const SITE = 'https://tltby12341.github.io/glowboard-2027/';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const params = new URLSearchParams(location.search);
const previewPro = params.get('pro') === 'preview';

const ICONS = {
  plane: '<path d="M2 16l20-8-6 12-3-5-5 3 1-5z"/>', coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6c0 2.4-5 1.2-5 3.6 0 1 1 1.6 2.5 1.6s2.5-.5 2.5-1.5"/>',
  bag: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', home: '<path d="M3 11l9-7 9 7v9H3z"/><path d="M10 20v-6h4v6"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19l8-8"/>', heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  sparkle: '<path d="M12 3c.5 4 2 6 6 6.5-4 .5-5.5 2.5-6 6.5-.5-4-2-6-6-6.5 4-.5 5.5-2.5 6-6.5z"/><path d="M19 15l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>', glass: '<path d="M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v7M8 21h8"/>',
  mountain: '<path d="M3 20l6-11 4 7 3-4 5 8z"/>', paw: '<circle cx="7" cy="10" r="1.6"/><circle cx="17" cy="10" r="1.6"/><circle cx="10" cy="6" r="1.6"/><circle cx="14" cy="6" r="1.6"/><path d="M12 12c-3 0-5 4-5 6s2 2 5 1 5 1 5-1-2-6-5-6z"/>',
  car: '<path d="M3 16v-3l2-5h14l2 5v3z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
};

const state = {
  lang: 'en',
  goals: ['travel', 'money', 'selfcare', 'love'],
  custom: [],
  themeId: 'clean',
  title: '2027',
  word: '',
  clockSafe: true,
  userPhotos: [],
  seed: Math.floor(Math.random() * 1e6) + 1,
  size: 'iphone',
};
state.word = WORDS[state.lang][0];
let isPro = previewPro || localStorage.getItem('gb_pro') === '1';
const T = (k) => (STRINGS[state.lang] && STRINGS[state.lang][k]) ?? STRINGS.en[k] ?? k;

function track(name, props) { try { window.plausible && window.plausible(name, { props }); window.umami && window.umami.track(name, props); } catch (e) {} }

// ---------- i18n ----------
function applyI18n() {
  $$('[data-i18n]').forEach((el) => { const v = T(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  $$('[data-i18n-ph]').forEach((el) => { el.placeholder = T(el.dataset.i18nPh); });
  $$('.pro-price').forEach((el) => (el.textContent = CFG.PRO_PRICE_LABEL));
  const faq = T('faq');
  $('#faqList').innerHTML = faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('');
  const d = new Date(2027, 0, 1);
  const ds = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  $$('.lock .date').forEach((el) => (el.textContent = ds));
  if (!CFG.PRO_PAYMENT_URL) $$('.unlock-btn').forEach((b) => { b.textContent = T('soon'); });
  renderChips();
}

// ---------- goals ----------
function renderChips() {
  $('#goalChips').innerHTML = CATEGORIES.map((c) => `<button type="button" class="chip ${state.goals.includes(c.id) ? 'on' : ''}" data-goal="${c.id}" aria-pressed="${state.goals.includes(c.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.icon]}</svg>${c[state.lang]}</button>`).join('');
  $('#customList').innerHTML = state.custom.map((c, i) => `<span class="tag">${escapeHtml(c)}<button type="button" data-rm="${i}" aria-label="${T('remove')}">×</button></span>`).join('');
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

$('#goalChips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-goal]'); if (!b) return;
  const id = b.dataset.goal;
  if (state.goals.includes(id)) { if (state.goals.length > 1) state.goals = state.goals.filter((g) => g !== id); }
  else { state.goals.push(id); if (state.goals.length > 7) state.goals.shift(); }
  renderChips(); schedule(true);
});
$('#customForm').addEventListener('submit', (e) => {
  e.preventDefault(); const v = $('#customInput').value.trim(); if (!v) return;
  if (state.custom.length >= 6) state.custom.shift();
  state.custom.push(v); $('#customInput').value = ''; renderChips(); schedule(true);
});
$('#customList').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (!b) return; state.custom.splice(+b.dataset.rm, 1); renderChips(); schedule(true); });
$('#surpriseBtn').addEventListener('click', () => {
  const ids = CATEGORIES.map((c) => c.id).sort(() => Math.random() - 0.5);
  state.goals = ids.slice(0, 4 + Math.floor(Math.random() * 3));
  const free = THEMES.filter((t) => isPro || !t.pro);
  state.themeId = THEMES[Math.floor(Math.random() * THEMES.length)].id;
  state.word = WORDS[state.lang][Math.floor(Math.random() * WORDS[state.lang].length)];
  $('#wordInput').value = state.word;
  state.seed = Math.floor(Math.random() * 1e6) + 1;
  renderChips(); markTheme(); schedule(true); track('surprise');
});

// ---------- themes ----------
function buildThemeGrid() {
  $('#themeGrid').innerHTML = THEMES.map((t) => `<button type="button" class="theme" data-theme="${t.id}"><canvas width="236" height="511"></canvas><span class="tname"><span>${t.name}</span><span class="badge ${t.pro ? 'pro' : ''}">${t.pro ? 'PRO' : T('free')}</span></span></button>`).join('');
  markTheme();
}
function markTheme() { $$('.theme').forEach((b) => b.classList.toggle('on', b.dataset.theme === state.themeId)); }
$('#themeGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-theme]'); if (!b) return;
  state.themeId = b.dataset.theme; markTheme(); schedule(false); track('theme', { id: state.themeId });
  if (matchMedia('(max-width:900px)').matches) $('#device').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
let thumbTimer;
function renderThumbs() {
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(async () => {
    for (const b of $$('.theme')) {
      await renderBoard(b.querySelector('canvas'), { ...state, themeId: b.dataset.theme }, { width: 236, height: 511 });
    }
  }, 220);
}

// ---------- step 3 ----------
$('#titleInput').addEventListener('input', (e) => { state.title = e.target.value; schedule(false); });
$('#wordInput').addEventListener('input', (e) => { state.word = e.target.value; schedule(false); });
$('#clockToggle').addEventListener('change', (e) => { state.clockSafe = e.target.checked; $('#device').classList.toggle('nolock', !state.clockSafe); schedule(true); });
$('#photoInput').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []).slice(0, 6);
  const imgs = await Promise.all(files.map((f) => new Promise((res) => {
    const url = URL.createObjectURL(f); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url;
  })));
  state.userPhotos = state.userPhotos.concat(imgs.filter(Boolean)).slice(-6);
  $('#clearPhotos').hidden = !state.userPhotos.length; schedule(true); track('own_photos', { n: state.userPhotos.length });
  e.target.value = '';
});
$('#clearPhotos').addEventListener('click', () => { state.userPhotos = []; $('#clearPhotos').hidden = true; schedule(true); });
$('#sizeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-size]'); if (!b) return;
  state.size = b.dataset.size; $$('#sizeSeg button').forEach((x) => x.classList.toggle('on', x === b));
  const dev = $('#device');
  dev.classList.toggle('landscape', state.size === 'desktop'); dev.classList.toggle('paper', state.size === 'print');
  schedule(false);
});
$('#shuffleBtn').addEventListener('click', () => { state.seed = Math.floor(Math.random() * 1e6) + 1; schedule(true); track('shuffle'); });

// ---------- preview ----------
let previewTimer, rendering = false, pending = false;
function schedule(thumbs) { clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 40); if (thumbs) renderThumbs(); }
async function renderPreview() {
  if (rendering) { pending = true; return; }
  rendering = true;
  const cv = $('#preview'); const dev = $('#device');
  const sz = SIZES[state.size];
  const cssW = cv.clientWidth || 320;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(cssW * dpr), h = Math.round(w * sz.h / sz.w);
  const t = themeById(state.themeId);
  dev.classList.toggle('is-pro', t.pro && !isPro);
  updateDlLabel();
  dev.classList.toggle('light', !['oldmoney', 'darkluxe'].includes(t.id));
  await renderBoard(cv, state, { width: w, height: h, kind: sz.kind, watermark: !isPro });
  const ft = $('#fabThumb canvas');
  if (ft) { ft.width = 96; ft.height = Math.round(96 * h / w); ft.getContext('2d').drawImage(cv, 0, 0, ft.width, ft.height); }
  rendering = false;
  if (pending) { pending = false; renderPreview(); }
}

// ---------- hero ----------
async function renderHero() {
  const presets = [
    { goals: ['travel', 'selfcare', 'love', 'money', 'home'], themeId: 'coquette', seed: 21, word: 'soft life' },
    { goals: ['career', 'money', 'travel', 'health', 'home'], themeId: 'clean', seed: 8, word: WORDS[state.lang][0] },
    { goals: ['money', 'car', 'travel', 'career', 'love'], themeId: 'darkluxe', seed: 5, word: 'ambition' },
  ];
  const cvs = $$('[data-hero]');
  for (const [i, cv] of cvs.entries()) {
    const p = presets[i];
    cv.closest('.phone').classList.toggle('light', p.themeId !== 'darkluxe');
    const w = Math.round((cv.clientWidth || 220) * Math.min(window.devicePixelRatio || 1, 2));
    await renderBoard(cv, { ...state, ...p, custom: [], userPhotos: [], title: '2027', clockSafe: true }, { width: w, height: Math.round(w * 2556 / 1179) });
  }
}

// ---------- download ----------
function needsPro() { return !isPro && (themeById(state.themeId).pro || SIZES[state.size].pro); }
async function download() {
  track('download_click', { theme: state.themeId, size: state.size });
  if (needsPro()) { openPay(); return; }
  const btns = [$('#downloadBtn'), $('#fabDownload')];
  btns.forEach((b) => { b.disabled = true; b.dataset.old = b.innerHTML; b.textContent = T('rendering'); });
  try {
    const sz = SIZES[state.size];
    const cv = document.createElement('canvas');
    await renderBoard(cv, state, { width: sz.w, height: sz.h, kind: sz.kind, watermark: !isPro });
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    showResult(blob);
    track('download_ok', { theme: state.themeId, size: state.size, pro: isPro });
  } finally {
    btns.forEach((b) => { b.disabled = false; b.innerHTML = b.dataset.old; });
  }
}
let lastBlob = null, lastUrl = null;
function showResult(blob) {
  lastBlob = blob; if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = URL.createObjectURL(blob);
  $('#resultImg').src = lastUrl; $('#saveLink').href = lastUrl;
  $('#resultUpsell').style.display = isPro ? 'none' : '';
  if (!isPro) renderBoard($('#upsellCv'), state, { width: 140, height: 303, watermark: false });
  const text = T('share_text');
  $('#pinLink').href = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(SITE)}&media=${encodeURIComponent(SITE + 'og-image.png')}&description=${encodeURIComponent(text)}`;
  $('#xLink').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE)}`;
  $('#waLink').href = `https://wa.me/?text=${encodeURIComponent(text + ' ' + SITE)}`;
  $('#shareBtn').style.display = navigator.share ? '' : 'none';
  openModal('resultModal');
}
$('#downloadBtn').addEventListener('click', download);
$('#upsellBtn').addEventListener('click', () => { closeModals(); openPay('result_upsell'); });
function updateDlLabel() {
  const lock = needsPro();
  const label = lock ? 'Unlock & download' : T('download');
  const s = $('#downloadBtn [data-i18n="download"]'); if (s) s.textContent = label;
  $('#fabDownload').textContent = lock ? '✦ ' + label : label;
  $('#downloadBtn').classList.toggle('locked', lock); $('#fabDownload').classList.toggle('locked', lock);
}
$('#fabDownload').addEventListener('click', download);
$('#fabThumb').addEventListener('click', () => $('#device').scrollIntoView({ behavior: 'smooth', block: 'center' }));
$('#saveLink').addEventListener('click', () => track('save_image'));
$('#shareBtn').addEventListener('click', async () => {
  try {
    const file = new File([lastBlob], 'glowboard-2027.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: T('share_text') + ' ' + SITE });
    else await navigator.share({ text: T('share_text'), url: SITE });
    track('share_native');
  } catch (e) {}
});
$('#copyBtn').addEventListener('click', async () => { try { await navigator.clipboard.writeText(SITE); toast(T('copied')); track('copy_link'); } catch (e) {} });

// ---------- pro / pay ----------
function openPay(reason) {
  const cur = themeById(state.themeId);
  const freeTheme = cur.pro ? 'clean' : state.themeId;
  const proTheme = cur.pro ? state.themeId : (THEMES.find((t) => t.pro) || cur).id;
  const W = 300, H = Math.round(300 * 2556 / 1179);
  openModal('payModal');
  renderBoard($('#cmpFree'), { ...state, themeId: freeTheme }, { width: W, height: H, watermark: true });
  renderBoard($('#cmpPro'), { ...state, themeId: proTheme }, { width: W, height: H, watermark: false });
  const strip = $('#proStrip');
  if (!strip.childElementCount) {
    THEMES.filter((t) => t.pro).forEach((t) => {
      const fig = document.createElement('figure'); const c = document.createElement('canvas'); fig.appendChild(c);
      const cap = document.createElement('figcaption'); cap.textContent = t.name; fig.appendChild(cap); strip.appendChild(fig);
      renderBoard(c, { ...state, themeId: t.id, userPhotos: [] }, { width: 120, height: 260 });
    });
  }
  track('paywall_view', { theme: state.themeId, size: state.size, reason: reason || '' });
}
$$('.unlock-btn').forEach((b) => b.addEventListener('click', () => {
  track('unlock_click');
  if (CFG.PRO_PAYMENT_URL) window.open(CFG.PRO_PAYMENT_URL, '_blank', 'noopener');
  else location.href = `mailto:${CFG.CONTACT_EMAIL}?subject=${encodeURIComponent('Glowboard Pro waitlist')}&body=${encodeURIComponent('Hi! Please let me know when Glowboard Pro is live.')}`;
}));
$('#freeAlt').addEventListener('click', () => {
  if (themeById(state.themeId).pro) state.themeId = 'clean';
  if (SIZES[state.size].pro) $('#sizeSeg [data-size="iphone"]').click();
  markTheme(); closeModals(); schedule(false);
});
$$('.code-btn').forEach((b) => b.addEventListener('click', () => { closeModals(); $('#codeMsg').textContent = ''; openModal('codeModal'); setTimeout(() => $('#codeInput').focus(), 50); }));
$('#codeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (await tryUnlock($('#codeInput').value.trim())) { closeModals(); }
  else $('#codeMsg').textContent = T('code_bad');
});
async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function tryUnlock(code) {
  if (!code || !CFG.UNLOCK_CODE_SHA256 || !crypto.subtle) return false;
  const h = await sha256(code);
  if (h.toLowerCase() !== CFG.UNLOCK_CODE_SHA256.toLowerCase()) return false;
  localStorage.setItem('gb_pro', '1'); isPro = true; confetti(); toast(T('unlocked')); schedule(true); track('unlocked');
  return true;
}

// ---------- affirmation pack ----------
$('#affBtn').addEventListener('click', () => {
  const grid = $('#affGrid'); grid.innerHTML = '';
  const pool = [];
  const goals = state.goals.length ? state.goals : Object.keys(AFFIRMATIONS);
  let gi = 0; const used = new Set();
  while (pool.length < 30 && gi < 400) {
    const g = goals[gi % goals.length]; const arr = AFFIRMATIONS[g][state.lang];
    const a = arr[Math.floor(gi / goals.length) % arr.length]; gi++;
    if (!used.has(a)) { used.add(a); pool.push(a); }
  }
  if (pool.length < 30) Object.values(AFFIRMATIONS).forEach((v) => v[state.lang].forEach((a) => { if (pool.length < 30 && !used.has(a)) { used.add(a); pool.push(a); } }));
  pool.forEach((text, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'aff-item' + (!isPro && i >= 3 ? ' locked' : '');
    const cv = document.createElement('canvas'); b.appendChild(cv); grid.appendChild(b);
    renderAffirmation(cv, state.themeId, text, i + 7, 236, 511, i + 1, state.lang);
    b.addEventListener('click', () => {
      if (!isPro && (i >= 3 || themeById(state.themeId).pro)) { closeModals(); openPay(); return; }
      const big = document.createElement('canvas'); renderAffirmation(big, state.themeId, text, i + 7, 1179, 2556, i + 1, state.lang);
      big.toBlob((blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `glowboard-affirmation-${i + 1}.png`; a.click(); });
      track('aff_download');
    });
  });
  openModal('affModal'); track('aff_open');
});

// ---------- modal / toast / confetti ----------
function openModal(id) { $('#' + id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModals() { $$('.modal.open').forEach((m) => m.classList.remove('open')); document.body.style.overflow = ''; }
$$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) closeModals(); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }
function confetti() {
  const colors = ['#F4C7C3', '#C8A26B', '#C9D3B9', '#E7D3AE', '#9B7BB0'];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement('i'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = colors[i % colors.length];
    c.style.animationDelay = Math.random() * 0.6 + 's'; c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    document.body.appendChild(c); setTimeout(() => c.remove(), 3200);
  }
}

// ---------- misc ----------
const fab = $('#fabBar');
const io = new IntersectionObserver((ents) => { ents.forEach((en) => fab.classList.toggle('show', en.isIntersecting)); }, { threshold: 0.05 });
io.observe($('#make'));
$('#contactLink').href = 'mailto:' + CFG.CONTACT_EMAIL; $('#contactLink').textContent = CFG.CONTACT_EMAIL;
if (CFG.TIP_URL) $$('.tip-link').forEach((a) => { a.href = CFG.TIP_URL; a.hidden = false; });
if (CFG.ANALYTICS_SNIPPET_URL) { const s = document.createElement('script'); s.defer = true; s.src = CFG.ANALYTICS_SNIPPET_URL; if (CFG.ANALYTICS_DOMAIN) s.dataset.domain = CFG.ANALYTICS_DOMAIN; document.head.appendChild(s); }

(async function init() {
  $('#wordInput').value = state.word;
  applyI18n(); buildThemeGrid();
  const code = params.get('unlock');
  if (code) {
    await tryUnlock(code);
    params.delete('unlock'); history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
  }
  await loadManifest(); await ensureFonts();
  await renderPreview(); renderHero(); renderThumbs();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { renderPreview(); renderHero(); }, 200); });
})();
