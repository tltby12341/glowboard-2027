import { CATEGORIES, STRINGS, WORDS, AFFIRMATIONS } from './data.js';
import { THEMES, themeById } from './themes.js';
import { makeZip } from './zip.js';
import { renderBoard, renderAffirmation, ensureFonts, SIZES, loadManifest, renderChecklist, renderHome, renderWidget, defaultWord } from './render.js';

const CFG = Object.assign({ PRO_PAYMENT_URL: '', PRO_PRICE_LABEL: '$4.99', UNLOCK_CODE_SHA256: '', TIP_URL: '', CONTACT_EMAIL: 'hello@example.com' }, window.GLOWBOARD_CONFIG || {});
const SITE = 'https://tltby12341.github.io/glowboard-2027/';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const params = new URLSearchParams(location.search);
const previewPro = params.get('pro') === 'preview';

// ---------- shareable template links ----------
function b64u(s) { return btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(s) { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0))); }
function encodeBoard() { return b64u(JSON.stringify({ g: state.goals, t: state.themeId, ti: state.title, w: state.word, c: state.custom, s: state.seed, f: state.font || undefined, sw: Object.keys(state.swaps || {}).length ? state.swaps : undefined })); }
function decodeBoard(s) {
  try {
    const o = JSON.parse(unb64u(s)); const cats = new Set(CATEGORIES.map((c) => c.id)); const out = {};
    if (Array.isArray(o.g)) { const g = o.g.filter((x) => cats.has(x)).slice(0, 7); if (g.length) out.goals = g; }
    if (THEMES.some((t) => t.id === o.t)) out.themeId = o.t;
    if (typeof o.ti === 'string') out.title = o.ti.slice(0, 24);
    if (typeof o.w === 'string') out.word = o.w.slice(0, 24);
    if (Array.isArray(o.c)) out.custom = o.c.filter((x) => typeof x === 'string').map((x) => x.slice(0, 60)).slice(0, 6);
    if (['serif', 'script', 'bold', 'hand'].includes(o.f)) out.font = o.f;
    if (o.sw && typeof o.sw === 'object') { const sw = {}; Object.entries(o.sw).slice(0, 10).forEach(([k, v]) => { if (/^\d$/.test(k) && Number.isFinite(v)) sw[k] = Math.abs(Math.floor(v)) % 100; }); out.swaps = sw; }
    if (Number.isFinite(o.s)) out.seed = Math.abs(Math.floor(o.s)) % 1e7 || 1;
    return out;
  } catch (e) { return null; }
}
function templateLink() { return SITE + '?b=' + encodeBoard() + '#make'; }

const ICONS = {
  plane: '<path d="M2 16l20-8-6 12-3-5-5 3 1-5z"/>', coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6c0 2.4-5 1.2-5 3.6 0 1 1 1.6 2.5 1.6s2.5-.5 2.5-1.5"/>',
  bag: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', home: '<path d="M3 11l9-7 9 7v9H3z"/><path d="M10 20v-6h4v6"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19l8-8"/>', heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  sparkle: '<path d="M12 3c.5 4 2 6 6 6.5-4 .5-5.5 2.5-6 6.5-.5-4-2-6-6-6.5 4-.5 5.5-2.5 6-6.5z"/><path d="M19 15l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>', glass: '<path d="M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v7M8 21h8"/>',
  mountain: '<path d="M3 20l6-11 4 7 3-4 5 8z"/>', paw: '<circle cx="7" cy="10" r="1.6"/><circle cx="17" cy="10" r="1.6"/><circle cx="10" cy="6" r="1.6"/><circle cx="14" cy="6" r="1.6"/><path d="M12 12c-3 0-5 4-5 6s2 2 5 1 5 1 5-1-2-6-5-6z"/>',
  car: '<path d="M3 16v-3l2-5h14l2 5v3z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
  hanger: '<path d="M12 7a2 2 0 1 1 2-2c0 1.2-2 1.5-2 3l9 7.5a1 1 0 0 1-.6 1.8H3.6a1 1 0 0 1-.6-1.8L12 8"/>',
  lips: '<path d="M2 12c3-4 6-5 10-2 4-3 7-2 10 2-3 4-6 6-10 6s-7-2-10-6z"/><path d="M2 12h20"/>',
  brush: '<path d="M14 4l6 6-8 8-6-6z"/><path d="M6 12l-3 3c-1 2 0 5 0 5s3 1 5 0l3-3"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/><path d="M22 9v6"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  moon: '<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',
  cup: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/>',
};

const state = {
  lang: 'en',
  goals: ['travel', 'money', 'selfcare', 'love'],
  custom: [],
  themeId: 'clean',
  title: '2027',
  word: '',
  clockSafe: true,
  font: '',
  swaps: {},
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
let chipsExpanded = false;
function renderChips() {
  const extraCount = CATEGORIES.slice(12).length;
  $('#goalChips').classList.toggle('all', chipsExpanded);
  $('#goalChips').innerHTML = CATEGORIES.map((c, i) => `<button type="button" class="chip ${i >= 12 ? 'extra' : ''} ${state.goals.includes(c.id) ? 'on' : ''}" data-goal="${c.id}" aria-pressed="${state.goals.includes(c.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.icon]}</svg>${c[state.lang]}</button>`).join('') + (chipsExpanded ? '' : `<button type="button" class="chip more-chip" id="moreChips" aria-expanded="false">+ ${extraCount} more goals</button>`);
  $('#customList').innerHTML = state.custom.map((c, i) => `<span class="tag">${escapeHtml(c)}<button type="button" data-rm="${i}" aria-label="${T('remove')}">×</button></span>`).join('');
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

$('#goalChips').addEventListener('click', (e) => {
  if (e.target.closest('#moreChips')) { chipsExpanded = true; renderChips(); track('more_goals'); return; }
  const b = e.target.closest('[data-goal]'); if (!b) return;
  const id = b.dataset.goal;
  if (state.goals.includes(id)) { if (state.goals.length > 1) state.goals = state.goals.filter((g) => g !== id); }
  else { state.goals.push(id); if (state.goals.length > 7) state.goals.shift(); }
  state.swaps = {}; renderChips(); schedule(true);
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
  state.seed = Math.floor(Math.random() * 1e6) + 1; state.swaps = {};
  renderChips(); markTheme(); schedule(true); track('surprise');
});

// ---------- quick-start vibes ----------
const VIBES = [
  { id: 'thatgirl', name: 'That girl', theme: 'clean', goals: ['selfcare', 'health', 'career', 'home'], word: 'discipline' },
  { id: 'softlife', name: 'Soft life', theme: 'coquette', goals: ['love', 'selfcare', 'travel', 'friends', 'style'], word: 'softness' },
  { id: 'oldmoney', name: 'Old money', theme: 'oldmoney', goals: ['travel', 'money', 'home', 'style'], word: 'elegance' },
  { id: 'moneyera', name: 'Money era', theme: 'darkluxe', goals: ['money', 'career', 'car', 'business', 'travel'], word: 'abundance' },
  { id: 'mobwife', name: 'Mob wife', theme: 'mobwife', goals: ['glam', 'money', 'love', 'style'], word: 'unapologetic' },
  { id: 'cozy', name: 'Cozy reset', theme: 'cozywinter', goals: ['cozy', 'home', 'peace', 'growth'], word: 'peace' },
  { id: 'student', name: 'Student glow-up', theme: 'mono', goals: ['study', 'growth', 'health', 'career'], word: 'focus' },
  { id: 'travel', name: 'Travel girl', theme: 'coastal', goals: ['travel', 'nature', 'friends', 'health'], word: 'adventure' },
  { id: 'academia', name: 'Dark academia', theme: 'academia', goals: ['study', 'growth', 'creative', 'peace'], word: 'devotion' },
  { id: 'pinky2k', name: 'Pink princess', theme: 'pinky2k', goals: ['glam', 'friends', 'style', 'selfcare', 'love'], word: 'iconic' },
  { id: 'aspen', name: 'Ski season', theme: 'aspen', goals: ['cozy', 'travel', 'money', 'style'], word: 'elegance' },
];
function renderVibes() {
  $('#vibes').innerHTML = VIBES.map((v) => { const t = themeById(v.theme); const bg = `linear-gradient(135deg, ${t.bg.join(', ')})`;
    return `<button type="button" class="vibe" data-vibe="${v.id}"><span class="sw" style="background:${bg}"><i style="background:${t.accent}"></i></span><span class="vn">${v.name}</span>${t.pro && !isPro ? '<b class="mini-pro">PRO</b>' : ''}</button>`; }).join('');
}
$('#vibes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-vibe]'); if (!b) return; const v = VIBES.find((x) => x.id === b.dataset.vibe);
  Object.assign(state, { themeId: v.theme, goals: v.goals.slice(), word: v.word, swaps: {}, seed: Math.floor(Math.random() * 1e6) + 1 });
  $('#wordInput').value = state.word; $$('.vibe').forEach((x) => x.classList.toggle('on', x === b));
  renderChips(); markTheme(); schedule(true); track('vibe', { vibe: v.id });
  if (matchMedia('(max-width: 900px)').matches) $('#device').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ---------- themes ----------
function buildThemeGrid() {
  $('#themeGrid').innerHTML = THEMES.map((t) => `<button type="button" class="theme" data-theme="${t.id}"><canvas width="236" height="511"></canvas><span class="tname"><span>${t.name}</span><span class="badge ${t.pro ? 'pro' : ''}">${t.pro ? 'PRO' : T('free')}</span></span></button>`).join('');
  markTheme();
}
function markTheme() {
  $$('.theme').forEach((b) => b.classList.toggle('on', b.dataset.theme === state.themeId));
  const g = $('#themeGrid'), on = g && g.querySelector('.theme.on');
  if (on && g.scrollWidth > g.clientWidth + 4) { const x = on.offsetLeft - g.offsetLeft - 18; if (x < g.scrollLeft || x + on.offsetWidth > g.scrollLeft + g.clientWidth) g.scrollTo({ left: Math.max(0, x), behavior: 'smooth' }); }
}
$('#themeGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-theme]'); if (!b) return;
  state.themeId = b.dataset.theme; markTheme(); schedule(false); track('theme', { id: state.themeId });
  if (matchMedia('(max-width:900px)').matches) $('#device').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
let thumbTimer;
let thumbsVisible = false, thumbsDirty = false, thumbGen = 0;
function renderThumbs() {
  if (!thumbsVisible) { thumbsDirty = true; return; }
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(async () => {
    const gen = ++thumbGen;
    for (const b of $$('.theme')) {
      if (gen !== thumbGen) return; // a newer render started
      await renderBoard(b.querySelector('canvas'), { ...state, themeId: b.dataset.theme }, { width: 236, height: 511 });
      await new Promise((res) => (window.requestIdleCallback || setTimeout)(res, { timeout: 120 }));
    }
  }, 220);
}
new IntersectionObserver((ents, obs) => {
  if (ents.some((e) => e.isIntersecting)) { thumbsVisible = true; obs.disconnect(); if (thumbsDirty) renderThumbs(); }
}, { rootMargin: '600px 0px' }).observe($('#themeGrid'));

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
  dev.classList.toggle('landscape', state.size === 'desktop'); dev.classList.toggle('paper', state.size === 'print'); dev.classList.toggle('story', state.size === 'story'); dev.classList.toggle('ipad', state.size === 'ipad');
  schedule(false);
});
$('#shuffleBtn').addEventListener('click', () => { state.seed = Math.floor(Math.random() * 1e6) + 1; state.swaps = {}; schedule(true); track('shuffle'); });
$('#fontSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-font]'); if (!b) return;
  state.font = b.dataset.font; $$('#fontSeg button').forEach((x) => x.classList.toggle('on', x === b));
  schedule(true); track('title_font', { font: state.font || 'default' });
});
function markFont() { $$('#fontSeg button').forEach((x) => x.classList.toggle('on', x.dataset.font === (state.font || ''))); }
$('#preview').addEventListener('click', (e) => {
  const cv = $('#preview'); const items = cv._items; if (!items) return;
  const rect = cv.getBoundingClientRect();
  const x = (e.clientX - rect.left) * cv.width / rect.width, y = (e.clientY - rect.top) * cv.height / rect.height;
  const hit = items.find((it) => it.type === 'photo' && !it.user && x >= it.x && x <= it.x + it.w && y >= it.y && y <= it.y + it.h);
  if (!hit) return;
  state.swaps = state.swaps || {}; state.swaps[hit.pidx] = (state.swaps[hit.pidx] || 0) + 1;
  schedule(false); track('photo_swap');
  const h = $('#swapHint'); if (h) h.classList.add('done');
});

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
  dev.classList.toggle('light', !['oldmoney', 'darkluxe', 'mobwife', 'cozywinter', 'academia'].includes(t.id));
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
    showResult(blob, state.size === 'story' ? 'glowboard-2027-story.png' : undefined);
    track('download_ok', { theme: state.themeId, size: state.size, pro: isPro });
  } finally {
    btns.forEach((b) => { b.disabled = false; b.innerHTML = b.dataset.old; });
  }
}
let lastBlob = null, lastUrl = null;
function showResult(blob, name) {
  lastBlob = blob; if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = URL.createObjectURL(blob);
  $('#resultImg').src = lastUrl; $('#saveLink').href = lastUrl; $('#saveLink').download = name || 'glowboard-2027.png';
  $('#resultUpsell').style.display = isPro ? 'none' : '';
  $('#homeBtn').innerHTML = isPro ? 'Get it' : 'Get it <b class="mini-pro">PRO</b>';
  $('#homeTeaser').hidden = !!(name && name !== 'glowboard-2027.png') || ['desktop', 'print', 'story', 'ipad'].includes(state.size);
  $('#setBtn').innerHTML = isPro ? 'Download the set (.zip)' : 'Get the set <b class="mini-pro">PRO</b>';
  $('#setTeaser').hidden = !!(name && /set|checklist|home/.test(name));
  if (!isPro) renderBoard($('#upsellCv'), state, { width: 140, height: 303, watermark: false });
  const text = T('share_text');
  const link = templateLink();
  $('#pinLink').href = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(link)}&media=${encodeURIComponent(SITE + 'og-image.png')}&description=${encodeURIComponent(text)}`;
  $('#xLink').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
  $('#waLink').href = `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`;
  $('#shareBtn').style.display = navigator.share ? '' : 'none';
  // iPhone-safe saving: the share sheet's "Save Image" puts it straight into Photos
  lastFile = new File([blob], name || 'glowboard-2027.png', { type: 'image/png' });
  useShareSave = IS_IOS && !!(navigator.canShare && navigator.canShare({ files: [lastFile] }));
  $('#saveLink').textContent = IS_IOS ? 'Save to Photos' : T('modal_save');
  $('#saveHint').innerHTML = IN_APP ? 'In the TikTok/Instagram browser, <b>press and hold the picture</b> and choose “Save to Photos”. For the smoothest save, tap ⋯ and choose <b>Open in Safari</b>.'
    : IS_IOS ? (useShareSave ? 'Tap <b>Save to Photos</b>, then choose <b>“Save Image”</b>. Or press and hold the picture.' : 'Press and hold the picture, then choose <b>“Save to Photos”</b>.')
    : 'Your PNG downloads at full resolution. On Android, find it in Files or Gallery → Downloads.';
  openModal('resultModal');
}
const UA = navigator.userAgent || '';
const IS_IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IN_APP = /Instagram|FBAN|FBAV|TikTok|musical_ly|Bytedance|Line\/|Snapchat|Pinterest\//i.test(UA);
let lastFile = null, useShareSave = false;
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
$('#saveLink').addEventListener('click', async (e) => {
  if (useShareSave && lastFile) {
    e.preventDefault();
    try { await navigator.share({ files: [lastFile] }); track('save_image', { via: 'share' }); return; }
    catch (err) { if (err && err.name === 'AbortError') return; }
    // share failed: show the image alone so it can be long-pressed
    window.open(lastUrl, '_blank');
  }
  track('save_image', { via: useShareSave ? 'fallback' : 'download' });
});
$('#saveLink').addEventListener('click', () => { savedFree = !isPro; });
$('#shareBtn').addEventListener('click', async () => {
  try {
    const file = new File([lastBlob], 'glowboard-2027.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: T('share_text') + ' ' + templateLink() });
    else await navigator.share({ text: T('share_text'), url: templateLink() });
    track('share_native');
  } catch (e) {}
});
async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = s; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) {} ta.remove(); return ok;
  }
}
$('#copyBtn').addEventListener('click', async () => { if (await copyText(templateLink())) toast('Template link copied. Anyone who opens it gets your board ✨'); track('copy_link'); });
$('#tplBtn').addEventListener('click', async () => {
  const url = templateLink(); track('template_share');
  if (navigator.share && matchMedia('(pointer:coarse)').matches) { try { await navigator.share({ title: 'My 2027 vision board', text: 'Make one like mine (free) ✨', url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  if (await copyText(url)) toast('Link copied. Your friend will open this exact board ✨');
});

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
      fig.tabIndex = 0; fig.setAttribute('role', 'button'); fig.setAttribute('aria-label', 'Preview ' + t.name);
      const pick = () => { strip.querySelectorAll('figure').forEach((f) => f.classList.toggle('on', f === fig)); renderBoard($('#cmpPro'), { ...state, themeId: t.id }, { width: W, height: H, watermark: false }); track('paywall_style', { theme: t.id }); };
      fig.addEventListener('click', pick); fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      renderBoard(c, { ...state, themeId: t.id, userPhotos: [] }, { width: 120, height: 260 });
    });
  }
  strip.querySelectorAll('figure').forEach((f, i) => f.classList.toggle('on', THEMES.filter((t) => t.pro)[i].id === proTheme));
  track('paywall_view', { theme: state.themeId, size: state.size, reason: reason || '' });
}
$$('.gift-btn').forEach((b) => b.addEventListener('click', () => {
  track('gift_pro_click');
  if (CFG.PRO_PAYMENT_URL) window.open(CFG.PRO_PAYMENT_URL + (CFG.PRO_PAYMENT_URL.includes('?') ? '&' : '?') + 'wanted=true', '_blank', 'noopener');
  else location.href = `mailto:${CFG.CONTACT_EMAIL}?subject=${encodeURIComponent('Gift Glowboard Pro')}`;
}));
$('#giftFreeBtn').addEventListener('click', () => {
  track('gift_free_click');
  if (state.title === '2027') { state.title = 'Your 2027'; $('#titleInput').value = state.title; schedule(false); }
  $('#make').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => toast('Design it for them, then tap “Send this board to a friend” 💌'), 700);
});
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
  localStorage.setItem('gb_pro', '1'); isPro = true; renderVibes(); confetti(); toast(T('unlocked')); schedule(true); track('unlocked');
  return true;
}

// ---------- affirmation pack ----------
async function canvasBlob(fn, type = 'image/png', q) { const cv = document.createElement('canvas'); await fn(cv); const b = await new Promise((res) => cv.toBlob(res, type, q)); cv.width = cv.height = 0; return b; }
$('#setBtn').addEventListener('click', async () => {
  track('set_click', { pro: isPro });
  if (!isPro) { closeModals(); openPay('full_set'); return; }
  const b = $('#setBtn'); const old = b.innerHTML; b.disabled = true;
  try {
    const phone = state.size === 'android' ? SIZES.android : SIZES.iphone;
    const jobs = [
      ['1-lock-screen.png', (cv) => renderBoard(cv, state, { width: phone.w, height: phone.h, kind: phone.kind, watermark: false })],
      ['2-home-screen.png', (cv) => renderHome(cv, state, phone.w, phone.h)],
      ['3-ipad.png', (cv) => renderBoard(cv, state, { width: SIZES.ipad.w, height: SIZES.ipad.h, kind: 'ipad', watermark: false })],
      ['4-desktop-4k.png', (cv) => renderBoard(cv, state, { width: SIZES.desktop.w, height: SIZES.desktop.h, kind: SIZES.desktop.kind, watermark: false })],
      ['5-ig-story.png', (cv) => renderBoard(cv, state, { width: SIZES.story.w, height: SIZES.story.h, kind: 'story', watermark: false })],
      ['6-goals-checklist-a4.png', (cv) => renderChecklist(cv, state)],
    ];
    // widget pack: 4 square affirmation tiles + 1 wide word-of-the-year tile (for Photos / Widgetsmith widgets)
    const wAffs = pickAffs(4);
    wAffs.forEach((txt, i) => jobs.push([`widgets/widget-square-${i + 1}.png`, (cv) => renderWidget(cv, state, txt, 1024, 1024, i + 1)]));
    const wWord = (state.word || defaultWord('en', state.seed || 1)).trim();
    jobs.push(['widgets/widget-wide-word.png', (cv) => renderWidget(cv, state, wWord, 2048, 960, 9, 'Word of the year')]);
    const files = [];
    for (let i = 0; i < jobs.length; i++) { b.textContent = `Making ${i + 1}/${jobs.length}…`; files.push({ name: 'glowboard-2027/' + jobs[i][0].replace('.png', '.jpg'), blob: await canvasBlob(jobs[i][1], 'image/jpeg', 0.93) }); }
    const zip = await makeZip(files);
    const a = document.createElement('a'); a.href = URL.createObjectURL(zip); a.download = 'glowboard-2027-set.zip'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    toast('Your 2027 set is downloading ✨'); track('set_ok');
  } finally { b.disabled = false; b.innerHTML = old; }
});
$('#homeBtn').addEventListener('click', async () => {
  track('home_click', { pro: isPro });
  if (!isPro) { closeModals(); openPay('home_screen'); return; }
  const b = $('#homeBtn'); const old = b.innerHTML; b.disabled = true; b.textContent = 'Making…';
  try {
    const sz = state.size === 'android' ? SIZES.android : SIZES.iphone;
    const cv = document.createElement('canvas'); await renderHome(cv, state, sz.w, sz.h);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    showResult(blob, 'glowboard-2027-home.png'); track('home_ok');
  } finally { b.disabled = false; b.innerHTML = old; }
});
$('#checklistBtn').addEventListener('click', async () => {
  track('checklist_click', { pro: isPro });
  if (!isPro) { openPay('checklist'); return; }
  const b = $('#checklistBtn'); const old = b.textContent; b.disabled = true; b.textContent = 'Making your checklist…';
  try {
    const cv = document.createElement('canvas'); await renderChecklist(cv, state);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    showResult(blob, 'glowboard-2027-checklist.png'); track('checklist_ok');
  } finally { b.disabled = false; b.textContent = old; }
});
function pickAffs(n) {
  const out = []; const used = new Set();
  const goals = state.goals.length ? state.goals : Object.keys(AFFIRMATIONS);
  for (let gi = 0; out.length < n && gi < 200; gi++) {
    const arr = AFFIRMATIONS[goals[gi % goals.length]][state.lang]; const s = arr[Math.floor(gi / goals.length) % arr.length];
    if (!used.has(s)) { used.add(s); out.push(s); }
  }
  return out;
}
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
function closeModals() {
  const wasResult = $('#resultModal').classList.contains('open');
  $$('.modal.open').forEach((m) => m.classList.remove('open')); document.body.style.overflow = '';
  if (wasResult && savedFree) setTimeout(() => showNudge('saved'), 900);
}
// ---------- tasteful nudge: once per session, free users only, after a save or on desktop exit intent ----------
let savedFree = false, engaged = false;
function nudgeAllowed() { try { return !isPro && !sessionStorage.getItem('gb_nudge') && !document.querySelector('.modal.open'); } catch (e) { return false; } }
function showNudge(kind) {
  if (!nudgeAllowed()) return;
  try { sessionStorage.setItem('gb_nudge', kind); } catch (e) {}
  const n = $('#nudge');
  if (kind === 'exit') {
    $('#nudgeTitle').textContent = 'Your 2027 board is one tap away';
    $('#nudgeText').innerHTML = 'Save the free version now, or go watermark-free with all 16 looks. <span class="pro-price">$4.99</span> once.';
    $('#nudgeGo').textContent = 'Save my board';
  }
  const cv = $('#nudgeCv'); const pt = THEMES.find((t) => t.id === state.themeId);
  renderBoard(cv, state, { width: 116, height: 252, watermark: false });
  n.hidden = false; requestAnimationFrame(() => n.classList.add('show'));
  n.dataset.kind = kind; track('nudge_view', { kind, theme: pt ? pt.id : '' });
}
function hideNudge() { const n = $('#nudge'); n.classList.remove('show'); setTimeout(() => { n.hidden = true; }, 320); }
$('#nudgeGo').addEventListener('click', () => {
  const kind = $('#nudge').dataset.kind; hideNudge(); track('nudge_click', { kind });
  if (kind === 'exit') { $('#make').scrollIntoView({ behavior: 'smooth' }); setTimeout(download, 400); } else openPay('nudge_' + kind);
});
$('#nudgeNo').addEventListener('click', () => { hideNudge(); track('nudge_dismiss'); });
$('#nudgeX').addEventListener('click', hideNudge);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#nudge').hidden) hideNudge(); });
['#themeGrid', '#vibes', '#chips', '#downloadBtn'].forEach((sel) => { const el = $(sel); if (el) el.addEventListener('click', () => { engaged = true; }, { capture: true }); });
// desktop only: the cursor leaving through the top edge (toward tabs / close)
document.addEventListener('mouseout', (e) => {
  if (!e.relatedTarget && e.clientY <= 4 && window.innerWidth >= 900 && engaged && !savedFree && performance.now() > 20000) showNudge('exit');
});
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
  let sharedLoaded = false;
  if (params.get('b')) { const sh = decodeBoard(params.get('b')); if (sh) { Object.assign(state, sh); sharedLoaded = true; } }
  const look = params.get('look'); if (look && THEMES.some((t) => t.id === look)) state.themeId = look;
  const pg = params.get('goals'); if (pg) { const cats = new Set(CATEGORIES.map((c) => c.id)); const g = pg.split(',').filter((x) => cats.has(x)).slice(0, 7); if (g.length) state.goals = g; }
  $('#titleInput').value = state.title; markFont();
  $('#wordInput').value = state.word;
  applyI18n(); buildThemeGrid(); renderVibes();
  const code = params.get('unlock');
  if (code) {
    await tryUnlock(code);
    params.delete('unlock'); history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
  }
  await loadManifest(); await ensureFonts();
  await renderPreview(); renderHero(); renderThumbs();
  if (sharedLoaded || look) { track(sharedLoaded ? 'template_open' : 'look_open', { theme: state.themeId }); if (sharedLoaded) toast('Board loaded. Tweak it and make it yours ✨'); }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { renderPreview(); renderHero(); }, 200); });
})();
