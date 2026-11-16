// Glowboard renderer: draws a vision board collage onto a canvas at any resolution.
import { AFFIRMATIONS, CATEGORIES, WORDS } from './data.js';
import { themeById } from './themes.js';

let MANIFEST = null;
const IMG_CACHE = new Map();
const GRAY_CACHE = new WeakMap();
let NOISE = null;

export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function loadManifest(base = './') {
  if (MANIFEST) return MANIFEST;
  try {
    const r = await fetch(base + 'assets/img/manifest.json');
    MANIFEST = await r.json();
  } catch (e) { MANIFEST = {}; }
  return MANIFEST;
}

export function loadImage(src) {
  if (IMG_CACHE.has(src)) return IMG_CACHE.get(src);
  const p = new Promise((resolve) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
  IMG_CACHE.set(src, p);
  return p;
}

function grayOf(img) {
  if (GRAY_CACHE.has(img)) return GRAY_CACHE.get(img);
  const w = Math.min(img.naturalWidth || img.width, 900);
  const h = Math.round(w * (img.naturalHeight || img.height) / (img.naturalWidth || img.width));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h); const a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    let g = a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11;
    g = Math.min(255, Math.max(0, (g - 128) * 1.12 + 128));
    a[i] = a[i + 1] = a[i + 2] = g;
  }
  x.putImageData(d, 0, 0); GRAY_CACHE.set(img, c); return c;
}

function noiseCanvas() {
  if (NOISE) return NOISE;
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const x = c.getContext('2d'); const d = x.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0); NOISE = c; return c;
}

// ---------- helpers ----------
function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawCover(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.max(w / iw, h / ih); const sw = w / s, sh = h / s;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

function fontStr(size, family, { italic = false, weight = 400 } = {}) {
  return `${italic ? 'italic ' : ''}${weight} ${Math.max(1, Math.round(size))}px ${family}`;
}

function hasCJK(s) { return /[\u3000-\u9fff\uff00-\uffef]/.test(s); }

function trackedWidth(ctx, text, tracking, size) {
  if (!tracking) return ctx.measureText(text).width;
  let w = 0; for (const ch of text) w += ctx.measureText(ch).width + tracking * size;
  return w - tracking * size;
}
function drawTracked(ctx, text, x, y, tracking, size, mode = 'fill') {
  if (!tracking) { mode === 'fill' ? ctx.fillText(text, x, y) : ctx.strokeText(text, x, y); return; }
  const total = trackedWidth(ctx, text, tracking, size);
  const align = ctx.textAlign; ctx.textAlign = 'left';
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const ch of text) {
    mode === 'fill' ? ctx.fillText(ch, cx, y) : ctx.strokeText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking * size;
  }
  ctx.textAlign = align;
}

function wrap(ctx, text, maxW) {
  const cjk = hasCJK(text);
  const tokens = cjk ? Array.from(text) : text.split(/\s+/);
  const lines = []; let line = '';
  for (const t of tokens) {
    const test = line ? (cjk ? line + t : line + ' ' + t) : t;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = t; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// ---------- stickers ----------
function sticker(ctx, kind, x, y, s, color, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.strokeStyle = color;
  switch (kind) {
    case 'sparkle': case 'star4': {
      const k = kind === 'star4' ? 0.12 : 0.22;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        const ox = Math.cos(a) * s, oy = Math.sin(a) * s;
        const na = a + Math.PI / 2; const nx = Math.cos(na) * s, ny = Math.sin(na) * s;
        if (i === 0) ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo((ox + nx) * k, (oy + ny) * k, nx, ny);
      }
      ctx.closePath(); ctx.fill(); break;
    }
    case 'sparkle4': {
      sticker(ctx, 'sparkle', 0, 0, s * 0.7, color);
      ctx.beginPath(); ctx.arc(s * 0.85, -s * 0.75, s * 0.14, 0, Math.PI * 2); ctx.fill(); break;
    }
    case 'star5': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.45 : s; const a = -Math.PI / 2 + i * Math.PI / 5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.18; ctx.fill(); ctx.stroke(); break;
    }
    case 'heart': {
      ctx.beginPath(); ctx.moveTo(0, s * 0.85);
      ctx.bezierCurveTo(-s * 1.25, 0, -s * 0.75, -s * 0.95, 0, -s * 0.38);
      ctx.bezierCurveTo(s * 0.75, -s * 0.95, s * 1.25, 0, 0, s * 0.85);
      ctx.fill(); break;
    }
    case 'bow': {
      ctx.lineWidth = s * 0.08; ctx.strokeStyle = 'rgba(150,60,80,0.35)';
      const loop = (dir) => {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(dir * s * 0.5, -s * 0.9, dir * s * 1.25, -s * 0.55, dir * s * 1.05, s * 0.05);
        ctx.bezierCurveTo(dir * s * 0.95, s * 0.45, dir * s * 0.45, s * 0.25, 0, 0);
        ctx.fill(); ctx.stroke();
      };
      const tail = (dir) => {
        ctx.beginPath(); ctx.moveTo(dir * s * 0.05, s * 0.1);
        ctx.bezierCurveTo(dir * s * 0.25, s * 0.6, dir * s * 0.2, s * 0.9, dir * s * 0.55, s * 1.35);
        ctx.lineTo(dir * s * 0.75, s * 1.15);
        ctx.bezierCurveTo(dir * s * 0.45, s * 0.8, dir * s * 0.45, s * 0.5, dir * s * 0.18, s * 0.05);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      };
      tail(-1); tail(1); loop(-1); loop(1);
      ctx.beginPath(); ctx.ellipse(0, s * 0.02, s * 0.2, s * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    }
    case 'flower': {
      for (let i = 0; i < 5; i++) {
        ctx.save(); ctx.rotate(i * Math.PI * 2 / 5);
        ctx.beginPath(); ctx.ellipse(0, -s * 0.55, s * 0.32, s * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = '#E9B949'; ctx.beginPath(); ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2); ctx.fill(); break;
    }
    case 'leaf': {
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.7, 0, 0, s); ctx.quadraticCurveTo(-s * 0.7, 0, 0, -s); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = s * 0.06; ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, s * 0.85); ctx.stroke(); break;
    }
    case 'pin': {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(-s * 0.16, -s * 0.16, s * 0.15, 0, Math.PI * 2); ctx.fill(); break;
    }
    case 'plus': {
      ctx.lineWidth = s * 0.12; ctx.beginPath(); ctx.moveTo(-s * 0.6, 0); ctx.lineTo(s * 0.6, 0); ctx.moveTo(0, -s * 0.6); ctx.lineTo(0, s * 0.6); ctx.stroke(); break;
    }
  }
  ctx.restore();
}

// ---------- background ----------
function drawBackground(ctx, t, W, H, r) {
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
  t.bg.forEach((c, i) => g.addColorStop(i / (t.bg.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const u = Math.min(W, H) / 100;
  if (t.iridescent) {
    const blobs = [['rgba(255,255,255,0.75)', 0.2, 0.15], ['rgba(170,140,255,0.45)', 0.85, 0.3], ['rgba(255,160,220,0.45)', 0.15, 0.7], ['rgba(140,240,220,0.5)', 0.8, 0.85]];
    for (const [c, bx, by] of blobs) {
      const rg = ctx.createRadialGradient(bx * W, by * H, 0, bx * W, by * H, Math.max(W, H) * 0.45);
      rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
  }
  if (t.glow) {
    const rg = ctx.createRadialGradient(W * 0.5, H * 0.25, 0, W * 0.5, H * 0.25, Math.max(W, H) * 0.6);
    rg.addColorStop(0, t.glow); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  if (t.pattern === 'dots') {
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; const step = u * 6;
    for (let y = step / 2, row = 0; y < H; y += step, row++)
      for (let x = (row % 2 ? step / 2 : 0) + step / 4; x < W; x += step) { ctx.beginPath(); ctx.arc(x, y, u * 0.55, 0, Math.PI * 2); ctx.fill(); }
  }
  if (t.pattern === 'leopard') {
    for (let i = 0; i < 260; i++) {
      const x = r() * W, y = r() * H, s = u * (1.2 + r() * 1.6), a = r() * Math.PI;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = 'rgba(190,130,70,0.10)'; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = s * 0.32; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const b = k * 2.1 + r() * 0.6; ctx.beginPath(); ctx.arc(0, 0, s, b, b + 1.1); ctx.stroke(); }
      ctx.restore();
    }
  }
  if (t.pattern === 'snow') {
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.45})`;
      ctx.beginPath(); ctx.arc(r() * W, r() * H, u * (0.12 + r() * 0.45), 0, Math.PI * 2); ctx.fill();
    }
  }
  if (t.pattern === 'stripes') {
    ctx.fillStyle = 'rgba(62,141,184,0.10)'; const sw = u * 4;
    for (let x = 0; x < W; x += sw * 2) ctx.fillRect(x, 0, sw, H);
  }
  if (t.pattern === 'checker') {
    ctx.fillStyle = 'rgba(255,255,255,0.13)'; const s = u * 7;
    for (let y = 0, row = 0; y < H; y += s, row++) for (let x = (row % 2) * s; x < W; x += s * 2) ctx.fillRect(x, y, s, s);
  }
  if (t.pattern === 'grid') {
    ctx.strokeStyle = 'rgba(90,120,160,0.13)'; ctx.lineWidth = Math.max(1, u * 0.12); const s = u * 4;
    ctx.beginPath(); for (let x = 0; x < W; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y < H; y += s) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
  }
  if (t.pattern === 'pearls') {
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = r() * H, s = u * (0.5 + r() * 0.9);
      const pg = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, s * 0.1, x, y, s);
      pg.addColorStop(0, 'rgba(255,255,255,0.9)'); pg.addColorStop(1, 'rgba(230,200,195,0.35)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (t.cork) {
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(90,60,30,0.18)' : 'rgba(255,240,210,0.18)';
      ctx.beginPath(); ctx.arc(r() * W, r() * H, u * (0.15 + r() * 0.35), 0, Math.PI * 2); ctx.fill();
    }
  }
  if (t.paper) {
    ctx.strokeStyle = 'rgba(120,130,90,0.06)'; ctx.lineWidth = u * 0.15;
    for (let i = 0; i < 160; i++) { const x = r() * W, y = r() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * u * 8, y + (r() - 0.5) * u * 2); ctx.stroke(); }
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.10)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

function drawGrain(ctx, t, W, H) {
  if (!t.grain) return;
  ctx.save(); ctx.globalAlpha = t.grain; ctx.globalCompositeOperation = 'overlay';
  const p = ctx.createPattern(noiseCanvas(), 'repeat');
  const sc = Math.max(1, W / 900);
  ctx.scale(sc, sc); ctx.fillStyle = p; ctx.fillRect(0, 0, W / sc, H / sc); ctx.restore();
}

// ---------- layout ----------
function splitCells(rect, n, r, minSide) {
  const cells = [rect];
  let guard = 0;
  while (cells.length < n && guard++ < 200) {
    cells.sort((a, b) => b.w * b.h - a.w * a.h);
    const idx = r() < 0.75 ? 0 : Math.min(1, cells.length - 1);
    const c = cells[idx];
    const aspect = c.w / c.h;
    let vertical = aspect > 1.1 ? true : aspect < 0.8 ? false : r() < 0.5;
    const ratio = 0.4 + r() * 0.2;
    if (vertical && c.w * ratio < minSide) vertical = false;
    if (!vertical && c.h * ratio < minSide) vertical = true;
    cells.splice(idx, 1);
    if (vertical) {
      cells.push({ x: c.x, y: c.y, w: c.w * ratio, h: c.h }, { x: c.x + c.w * ratio, y: c.y, w: c.w * (1 - ratio), h: c.h });
    } else {
      cells.push({ x: c.x, y: c.y, w: c.w, h: c.h * ratio }, { x: c.x, y: c.y + c.h * ratio, w: c.w, h: c.h * (1 - ratio) });
    }
  }
  return cells;
}

export function buildItems(state, manifest, lang) {
  const r = rng(state.seed * 7 + 3);
  const goals = state.goals.length ? state.goals : ['travel', 'money', 'selfcare', 'home'];
  const photos = [];
  (state.userPhotos || []).forEach((img) => photos.push({ type: 'photo', img, cat: null, user: true }));
  const pickFrom = (cat) => {
    const list = (manifest && manifest[cat]) || [];
    if (!list.length) return { type: 'photo', src: null, cat };
    return { type: 'photo', src: 'assets/img/' + list[Math.floor(r() * list.length)], cat };
  };
  goals.forEach((g) => photos.push(pickFrom(g)));
  const th = themeById(state.themeId);
  if (th.mood && manifest && manifest[th.mood] && !goals.includes(th.mood)) photos.splice(Math.min(1, photos.length), 0, pickFrom(th.mood));
  // second image for categories with more images, to fill
  const fillers = ['travel', 'selfcare', 'home', 'health', 'money', 'nature', 'love', 'growth'];
  let fi = Math.floor(r() * fillers.length);
  const used = new Set(photos.map((p) => p.src));
  let guard = 0;
  while (photos.length < 7 && guard++ < 40) {
    const g = guard < 20 ? goals[guard % goals.length] : fillers[fi++ % fillers.length];
    const list = (manifest && manifest[g]) || [];
    const cand = list.map((f) => 'assets/img/' + f).find((s) => !used.has(s));
    if (cand) { used.add(cand); photos.push({ type: 'photo', src: cand, cat: g }); }
  }
  // de-dup
  const seen = new Set(); const uniq = [];
  for (const p of photos) { const k = p.user ? Math.random() : p.src; if (!seen.has(k)) { seen.add(k); uniq.push(p); } }
  const photoItems = uniq.slice(0, (state.userPhotos||[]).length ? 8 : 7);

  const texts = [];
  (state.custom || []).forEach((c) => c.trim() && texts.push({ type: 'text', text: c.trim(), label: true }));
  const affs = [];
  goals.forEach((g) => { const arr = AFFIRMATIONS[g]?.[lang] || []; if (arr.length) affs.push(arr[Math.floor(r() * arr.length)]); });
  for (let i = affs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [affs[i], affs[j]] = [affs[j], affs[i]]; }
  affs.forEach((a) => texts.push({ type: 'text', text: a }));
  const textCount = Math.min(texts.length, 3);
  return { photos: photoItems, texts: texts.slice(0, textCount) };
}

// ---------- main render ----------
const TITLE_FONTS = {
  serif: { titleFont: '"Instrument Serif", serif', titleItalic: false, titleWeight: 400, titleCaps: false, titleTracking: 0, titleScale: 1 },
  script: { titleFont: '"Pinyon Script", cursive', titleItalic: false, titleWeight: 400, titleCaps: false, titleTracking: 0, titleScale: 1.08 },
  bold: { titleFont: '"Syne", "Inter", sans-serif', titleItalic: false, titleWeight: 800, titleCaps: false, titleTracking: -0.02, titleScale: 0.92 },
  hand: { titleFont: '"Caveat", cursive', titleItalic: false, titleWeight: 700, titleCaps: false, titleTracking: 0, titleScale: 1.15 },
};
function swapPhotos(photos, swaps, manifest) {
  if (!swaps || !manifest) return;
  const all = Object.values(manifest).flat().map((f) => 'assets/img/' + f);
  Object.entries(swaps).forEach(([k, n]) => {
    const i = +k, p = photos[i]; if (!p || p.user || !n) return;
    const used = new Set(photos.map((q) => q.src));
    const own = ((p.cat && manifest[p.cat]) || []).map((f) => 'assets/img/' + f);
    const pool = [...new Set([...own, ...all])].filter((s) => s === p.src || !used.has(s));
    const at = pool.indexOf(p.src);
    p.src = pool[(at + n) % pool.length]; p.img = null;
  });
}
export async function renderBoard(canvas, state, opts = {}) {
  const manifest = await loadManifest();
  const lang = state.lang || 'en';
  let t = themeById(state.themeId);
  if (state.font && TITLE_FONTS[state.font]) t = { ...t, ...TITLE_FONTS[state.font] };
  const W = opts.width || canvas.width, H = opts.height || canvas.height;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d');
  const r = rng(state.seed || 1);
  const landscape = W > H * 1.1;
  const u = (landscape ? H : W) / 100;

  const { photos, texts } = buildItems(state, manifest, lang);
  swapPhotos(photos, state.swaps, manifest);
  await Promise.all(photos.map(async (p) => { if (!p.img && p.src) p.img = await loadImage(p.src); }));

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, t, W, H, r);

  // regions
  let titleBox, collage;
  const isPrint = opts.kind === 'print';
  if (landscape) {
    titleBox = { x: W * 0.05, y: H * 0.1, w: W * 0.27, h: H * 0.8 };
    collage = { x: W * 0.35, y: H * 0.07, w: W * 0.6, h: H * 0.86 };
  } else {
    const isStory = opts.kind === 'story';
    const isIpad = opts.kind === 'ipad';
    const top = state.clockSafe && !isPrint && !isStory ? H * (isIpad ? 0.22 : 0.285) : H * (isStory ? 0.075 : 0.055);
    const th = H * (isPrint ? 0.14 : 0.13);
    titleBox = { x: W * 0.06, y: top, w: W * 0.88, h: th };
    const bottom = isPrint ? H * 0.95 : H * 0.915;
    collage = { x: W * 0.055, y: top + th + u * 2, w: W * 0.89, h: bottom - (top + th + u * 2) };
  }

  const total = photos.length + texts.length;
  const cells = splitCells(collage, total, r, u * 17);
  // assign text cards to the smallest / widest cells
  const order = cells.map((c, i) => { const a = c.w / c.h; return { c, i, score: c.w * c.h * (a < 0.62 ? 3.5 : a > 1.15 ? 0.75 : 1) + r() * u * u * 40 }; })
    .sort((a, b) => a.score - b.score);
  const textIdx = new Set(order.slice(0, texts.length).map((o) => o.i));
  const items = []; let pi = 0, ti = 0;
  cells.forEach((c, i) => {
    if (textIdx.has(i)) items.push({ ...texts[ti++], cell: c });
    else { items.push({ ...photos[pi], pidx: pi, cell: c }); pi++; }
  });

  const gap = t.gap * u;
  const scrap = t.rotate > 0;
  const drawOrder = scrap ? items.slice().sort(() => r() - 0.5) : items;
  canvas._items = items.map((it) => ({ type: it.type, pidx: it.pidx, user: !!it.user, x: it.cell.x, y: it.cell.y, w: it.cell.w, h: it.cell.h }));
  for (const it of drawOrder) {
    const c = it.cell;
    let x = c.x + gap / 2, y = c.y + gap / 2, w = c.w - gap, h = c.h - gap;
    let rot = 0;
    if (scrap) {
      const grow = 1.06; const nw = w * grow, nh = h * grow; x -= (nw - w) / 2; y -= (nh - h) / 2; w = nw; h = nh;
      rot = (r() - 0.5) * 2 * t.rotate * Math.PI / 180;
    }
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
    if (it.type === 'photo') drawPhoto(ctx, t, it, w, h, u, lang, r);
    else drawTextCard(ctx, t, it, w, h, u, lang, r);
    ctx.restore();
  }

  drawTitle(ctx, t, state, titleBox, u, lang, landscape);

  // stickers
  const n = t.stickerCount + (landscape ? 2 : 0);
  for (let i = 0; i < n; i++) {
    const kind = t.stickers[Math.floor(r() * t.stickers.length)];
    const color = t.stickerColors[Math.floor(r() * t.stickerColors.length)];
    let sx, sy;
    if (i < 2) { // near title
      sx = titleBox.x + (i ? titleBox.w * (0.82 + r() * 0.12) : titleBox.w * (0.04 + r() * 0.1));
      sy = titleBox.y + titleBox.h * (0.15 + r() * 0.5);
    } else {
      const c = cells[Math.floor(r() * cells.length)];
      sx = c.x + (r() < 0.5 ? 0 : c.w); sy = c.y + (r() < 0.5 ? 0 : c.h);
    }
    const size = u * (kind === 'bow' ? 4.2 + r() * 1.8 : 1.8 + r() * 2.4);
    ctx.save();
    if (t.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = u * 0.8; ctx.shadowOffsetY = u * 0.25; }
    sticker(ctx, kind, sx, sy, size, color, (r() - 0.5) * 0.6);
    ctx.restore();
  }

  drawGrain(ctx, t, W, H);
  if (opts.watermark) drawWatermark(ctx, t, W, H, u, landscape);
  ctx.restore();
  return canvas;
}

function shadowOn(ctx, t, u, k = 1) {
  if (!t.shadow) return;
  ctx.shadowColor = t.shadow; ctx.shadowBlur = u * 2.2 * k; ctx.shadowOffsetY = u * 0.8 * k;
}
function shadowOff(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

function placeholder(ctx, t, x, y, w, h, u) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, t.soft); g.addColorStop(1, t.accent);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  sticker(ctx, 'sparkle', x + w / 2, y + h / 2, Math.min(w, h) * 0.12, 'rgba(255,255,255,0.8)');
}

function imgOrPlaceholder(ctx, t, it, x, y, w, h, u) {
  if (it.img) {
    const src = t.grayscale ? grayOf(it.img) : it.img;
    drawCover(ctx, src, x, y, w, h);
  } else placeholder(ctx, t, x, y, w, h, u);
}

function tape(ctx, t, w, u, r) {
  ctx.save(); ctx.translate(w / 2 + (r() - 0.5) * w * 0.2, 0); ctx.rotate((r() - 0.5) * 0.3);
  ctx.fillStyle = t.tape || 'rgba(255,255,255,0.6)';
  ctx.fillRect(-u * 5, -u * 1.4, u * 10, u * 2.8);
  ctx.restore();
}

function drawPhoto(ctx, t, it, w, h, u, lang, r) {
  const rad = t.radius * u;
  switch (t.frame) {
    case 'bordered': case 'tape': {
      const b = u * (t.frame === 'tape' ? 1 : 1.1);
      shadowOn(ctx, t, u); ctx.fillStyle = t.border; rr(ctx, 0, 0, w, h, rad); ctx.fill(); shadowOff(ctx);
      ctx.save(); rr(ctx, b, b, w - 2 * b, h - 2 * b, Math.max(0, rad - b * 0.6)); ctx.clip();
      imgOrPlaceholder(ctx, t, it, b, b, w - 2 * b, h - 2 * b, u); ctx.restore();
      if (t.frame === 'tape' && r() < 0.8) tape(ctx, t, w, u, r);
      break;
    }
    case 'matted': {
      shadowOn(ctx, t, u); ctx.fillStyle = t.mat; ctx.fillRect(0, 0, w, h); shadowOff(ctx);
      const m = u * 1.6;
      ctx.save(); ctx.beginPath(); ctx.rect(m, m, w - 2 * m, h - 2 * m); ctx.clip();
      imgOrPlaceholder(ctx, t, it, m, m, w - 2 * m, h - 2 * m, u); ctx.restore();
      ctx.strokeStyle = t.line; ctx.lineWidth = u * 0.22; ctx.strokeRect(m * 0.45, m * 0.45, w - m * 0.9, h - m * 0.9);
      break;
    }
    case 'polaroid': {
      const side = Math.min(w, h) * 0.06, bottom = Math.min(w, h) * 0.2;
      shadowOn(ctx, t, u, 1.2); ctx.fillStyle = t.border; ctx.fillRect(0, 0, w, h); shadowOff(ctx);
      ctx.save(); ctx.beginPath(); ctx.rect(side, side, w - 2 * side, h - side - bottom); ctx.clip();
      imgOrPlaceholder(ctx, t, it, side, side, w - 2 * side, h - side - bottom, u); ctx.restore();
      if (it.cat) {
        const cat = CATEGORIES.find((c) => c.id === it.cat);
        const label = cat ? cat[lang] : '';
        ctx.fillStyle = t.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = fontStr(Math.min(bottom * 0.62, w * 0.14), t.labelFont, { weight: 600 });
        ctx.fillText(label, w / 2, h - bottom / 2);
      }
      if (r() < 0.75) tape(ctx, t, w, u, r);
      break;
    }
    case 'goldline': {
      shadowOn(ctx, t, u);
      ctx.fillStyle = '#000'; rr(ctx, 0, 0, w, h, rad); ctx.fill(); shadowOff(ctx);
      ctx.save(); rr(ctx, 0, 0, w, h, rad); ctx.clip(); imgOrPlaceholder(ctx, t, it, 0, 0, w, h, u);
      const gl = ctx.createLinearGradient(0, 0, w, h); gl.addColorStop(0, 'rgba(255,240,210,0.18)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h); ctx.restore();
      ctx.strokeStyle = t.line; ctx.lineWidth = u * 0.28; rr(ctx, u * 0.9, u * 0.9, w - u * 1.8, h - u * 1.8, Math.max(0, rad - u * 0.6)); ctx.stroke();
      break;
    }
    case 'glow': {
      ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = u * 3;
      ctx.fillStyle = '#fff'; rr(ctx, 0, 0, w, h, rad); ctx.fill(); ctx.restore();
      const b = u * 0.8;
      ctx.save(); rr(ctx, b, b, w - 2 * b, h - 2 * b, rad - b); ctx.clip(); imgOrPlaceholder(ctx, t, it, b, b, w - 2 * b, h - 2 * b, u);
      const gl = ctx.createLinearGradient(0, 0, 0, h); gl.addColorStop(0, 'rgba(255,255,255,0.28)'); gl.addColorStop(0.35, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h); ctx.restore();
      break;
    }
    case 'square': {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip(); imgOrPlaceholder(ctx, t, it, 0, 0, w, h, u); ctx.restore();
      break;
    }
    default: { // rounded
      shadowOn(ctx, t, u); ctx.fillStyle = t.card; rr(ctx, 0, 0, w, h, rad); ctx.fill(); shadowOff(ctx);
      ctx.save(); rr(ctx, 0, 0, w, h, rad); ctx.clip(); imgOrPlaceholder(ctx, t, it, 0, 0, w, h, u); ctx.restore();
    }
  }
}

function drawTextCard(ctx, t, it, w, h, u, lang, r) {
  const rad = (t.frame === 'square' ? 0 : Math.max(t.radius, 1.2)) * u;
  shadowOn(ctx, t, u, 0.8);
  ctx.fillStyle = t.card; rr(ctx, 0, 0, w, h, rad); ctx.fill(); shadowOff(ctx);
  if (t.cardStroke) { ctx.strokeStyle = t.cardStroke; ctx.lineWidth = u * 0.25; rr(ctx, u * 0.8, u * 0.8, w - u * 1.6, h - u * 1.6, Math.max(0, rad - u * 0.5)); ctx.stroke(); }
  if (t.cardLined) {
    ctx.strokeStyle = 'rgba(80,120,200,0.18)'; ctx.lineWidth = u * 0.12;
    for (let y = u * 4; y < h; y += u * 3.2) { ctx.beginPath(); ctx.moveTo(u, y); ctx.lineTo(w - u, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(220,80,80,0.25)'; ctx.beginPath(); ctx.moveTo(u * 3.5, 0); ctx.lineTo(u * 3.5, h); ctx.stroke();
  }
  if (t.frame === 'tape' || t.frame === 'polaroid') tape(ctx, t, w, u, r);
  const text = it.text;
  const pad = Math.min(w, h) * 0.12;
  const maxW = w - pad * 2, maxH = h - pad * 2 - (it.label ? u * 3 : 0);
  const scale = t.textScale || 1;
  let size = Math.min(h * 0.26, w * 0.2) * scale;
  let lines;
  const opt = { weight: t.textWeight || 400, italic: false };
  for (let k = 0; k < 40; k++) {
    ctx.font = fontStr(size, t.textFont, opt);
    lines = wrap(ctx, text, maxW);
    const tooWide = lines.some((l) => ctx.measureText(l).width > maxW);
    if (lines.length * size * 1.15 <= maxH && !tooWide) break;
    size *= 0.92;
  }
  ctx.fillStyle = t.cardInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lh = size * 1.12;
  const blockH = lines.length * lh;
  let y0 = h / 2 - blockH / 2 + lh / 2 + (it.label ? u * 1.4 : 0);
  if (it.label) {
    ctx.font = fontStr(u * 1.7, '"Inter", "PingFang SC", sans-serif', { weight: 600 });
    ctx.globalAlpha = 0.7;
    drawTracked(ctx, '2027 GOAL', w / 2, y0 - lh / 2 - u * 2.2, 0.25, u * 1.7);
    ctx.globalAlpha = 1;
  }
  ctx.font = fontStr(size, t.textFont, opt);
  lines.forEach((l, i) => ctx.fillText(l, w / 2, y0 + i * lh));
}

function drawTitle(ctx, t, state, box, u, lang, landscape) {
  const title = (state.title || '2027').slice(0, 14);
  const word = (state.word || '').slice(0, 24);
  ctx.save();
  ctx.textAlign = landscape ? 'left' : 'center'; ctx.textBaseline = 'alphabetic';
  const cx = landscape ? box.x : box.x + box.w / 2;
  const tracking = t.titleTracking || 0;
  const txt = t.titleCaps ? title.toUpperCase() : title;
  let size = (landscape ? box.h * 0.3 : box.h * 0.66) * (t.titleScale || 1);
  const fo = { italic: t.titleItalic, weight: t.titleWeight || 400 };
  ctx.font = fontStr(size, t.titleFont, fo);
  while (trackedWidth(ctx, txt, tracking, size) > box.w && size > 4) { size *= 0.94; ctx.font = fontStr(size, t.titleFont, fo); }
  const baseY = landscape ? box.y + box.h * 0.48 : box.y + box.h * 0.66;
  // label
  ctx.font = fontStr(u * (landscape ? 2.6 : 2.2), t.labelFont === '"Caveat", "Kaiti SC", cursive' ? '"Inter", sans-serif' : t.labelFont, { weight: 600 });
  ctx.fillStyle = t.ink; ctx.globalAlpha = 0.75;
  drawTracked(ctx, 'VISION BOARD', cx, baseY - size * 0.86, 0.32, u * 2.2);
  ctx.globalAlpha = 1;
  ctx.font = fontStr(size, t.titleFont, fo);
  if (t.titleGold) {
    const g = ctx.createLinearGradient(0, baseY - size, 0, baseY);
    g.addColorStop(0, '#F7E7C1'); g.addColorStop(0.5, '#D4AF6E'); g.addColorStop(1, '#9C7A3C'); ctx.fillStyle = g;
  } else if (t.titleChrome) {
    const g = ctx.createLinearGradient(0, baseY - size, 0, baseY);
    const cs = t.chromeStops || ['#FFFFFF', '#CFC8FF', '#6A55E0', '#3A2690', '#8F7CF0'];
    [0, 0.38, 0.52, 0.8, 1].forEach((p, i) => g.addColorStop(p, cs[i]));
    ctx.fillStyle = g;
    ctx.save(); ctx.shadowColor = t.chromeShadow || 'rgba(80,50,200,0.35)'; ctx.shadowBlur = u * 2; ctx.shadowOffsetY = u * 0.6;
    drawTracked(ctx, txt, cx, baseY, tracking, size); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = u * 0.35; drawTracked(ctx, txt, cx, baseY, tracking, size, 'stroke');
  } else ctx.fillStyle = t.ink;
  if (!t.titleChrome) drawTracked(ctx, txt, cx, baseY, tracking, size);
  if (word) {
    const wtxt = t.wordCaps ? word.toUpperCase() : word;
    let ws = size * (t.wordCaps ? 0.17 : 0.34) * (t.wordScale || 1);
    ctx.font = fontStr(ws, t.wordFont, { italic: t.wordItalic, weight: t.wordWeight || 400 });
    while (trackedWidth(ctx, wtxt, t.wordTracking || 0, ws) > box.w && ws > 4) { ws *= 0.94; ctx.font = fontStr(ws, t.wordFont, { italic: t.wordItalic, weight: t.wordWeight || 400 }); }
    ctx.fillStyle = t.titleGold ? '#D4AF6E' : t.accent === '#111111' ? '#111' : t.ink;
    ctx.globalAlpha = 0.92;
    drawTracked(ctx, wtxt, cx, baseY + ws * 1.25 + u * 0.6, t.wordTracking || 0, ws);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawWatermark(ctx, t, W, H, u, landscape) {
  const text = 'glowboard · make yours free';
  const s = u * (landscape ? 1.6 : 2.1);
  ctx.save();
  ctx.font = fontStr(s, '"Inter", sans-serif', { weight: 600 });
  const tw = ctx.measureText(text).width;
  const x = W / 2, y = landscape ? H - u * 3 : H - H * 0.042;
  const dark = ['oldmoney', 'darkluxe'].includes(t.id);
  ctx.fillStyle = dark ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.62)';
  rr(ctx, x - tw / 2 - s * 0.9, y - s * 0.95, tw + s * 1.8, s * 1.9, s); ctx.fill();
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.85)' : 'rgba(30,25,22,0.75)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + s * 0.05);
  ctx.restore();
}

// ---------- daily affirmation wallpaper ----------
export function renderAffirmation(canvas, themeId, text, seed, W = 1179, H = 2556, day = 1, lang = 'en') {
  const t = themeById(themeId);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); const r = rng(seed); const u = W / 100;
  drawBackground(ctx, t, W, H, r);
  ctx.fillStyle = t.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = fontStr(u * 3, '"Inter", "PingFang SC", sans-serif', { weight: 600 });
  ctx.globalAlpha = 0.7; drawTracked(ctx, ('DAY ' + day) + ' · 2027', W / 2, H * 0.42, 0.3, u * 3); ctx.globalAlpha = 1;
  let size = u * 11 * (t.textScale || 1);
  const fo = { weight: t.textWeight || 400, italic: t.wordItalic && !t.textWeight };
  let lines;
  for (let k = 0; k < 30; k++) { ctx.font = fontStr(size, t.textFont, fo); lines = wrap(ctx, text, W * 0.78); if (lines.length <= 4) break; size *= 0.92; }
  const lh = size * 1.12; const y0 = H * 0.53 - (lines.length - 1) * lh / 2;
  ctx.fillStyle = t.titleGold ? '#E8CF98' : t.ink;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh));
  for (let i = 0; i < 4; i++) sticker(ctx, t.stickers[i % t.stickers.length], W * (0.15 + r() * 0.7), i < 2 ? H * (0.33 + r() * 0.04) : H * (0.7 + r() * 0.06), u * (2 + r() * 2.5), t.stickerColors[i % t.stickerColors.length], (r() - 0.5) * 0.6);
  drawGrain(ctx, t, W, H);
  return canvas;
}

export async function ensureFonts() {
  if (!document.fonts) return;
  const t0 = Date.now();
  while (!Array.from(document.styleSheets).some((s) => (s.href || '').includes('fonts.googleapis')) && Date.now() - t0 < 4000) await new Promise((res) => setTimeout(res, 40));
  const specs = ['400 40px "Instrument Serif"', 'italic 400 40px "Instrument Serif"', '400 40px "Inter"', '600 40px "Inter"', '700 40px "Inter"', '800 40px "Inter"', '400 40px "Caveat"', '700 40px "Caveat"', '400 40px "Pinyon Script"', '800 40px "Syne"'];
  try { await Promise.all(specs.map((s) => document.fonts.load(s))); } catch (e) {}
}

export const SIZES = {
  iphone: { w: 1179, h: 2556, pro: false },
  android: { w: 1080, h: 2400, pro: false },
  desktop: { w: 3840, h: 2160, pro: true },
  print: { w: 2480, h: 3508, pro: true, kind: 'print' },
  story: { w: 1080, h: 1920, pro: false, kind: 'story' },
  ipad: { w: 2048, h: 2732, pro: true, kind: 'ipad' },
};

export function defaultWord(lang, seed) { const arr = WORDS[lang] || WORDS.en; return arr[seed % arr.length]; }

// ---------- printable 2027 goals checklist (Pro) ----------
export async function renderChecklist(canvas, state, W = 2480, H = 3508) {
  const manifest = await loadManifest();
  let t = themeById(state.themeId);
  if (state.font && TITLE_FONTS[state.font]) t = { ...t, ...TITLE_FONTS[state.font] };
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); const u = W / 100; const M = 7 * u;
  const ink = '#2A2421', soft = '#8A7F77';
  const lum = (hex) => { const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0.5; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const accent = lum(t.accent) > 0.82 ? '#C8A26B' : t.accent;
  ctx.fillStyle = '#FFFDF9'; ctx.fillRect(0, 0, W, H);
  // photo strip
  const { photos } = buildItems(state, manifest, 'en'); swapPhotos(photos, state.swaps, manifest);
  const strip = photos.slice(0, 4);
  await Promise.all(strip.map(async (p) => { if (!p.img && p.src) p.img = await loadImage(p.src); }));
  const sy = M, sh = 24 * u, gap = 1.6 * u, sw = (W - 2 * M - gap * 3) / 4;
  strip.forEach((p, i) => { const x = M + i * (sw + gap); ctx.save(); rr(ctx, x, sy, sw, sh, 2 * u); ctx.clip(); if (p.img) drawCover(ctx, p.img, x, sy, sw, sh); else { ctx.fillStyle = '#EFE7DC'; ctx.fillRect(x, sy, sw, sh); } ctx.restore(); });
  // title
  let y = sy + sh + 13 * u;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = ink;
  const title = (state.title || '2027').trim() || '2027';
  let ts = 13 * u * (t.titleScale || 1);
  ctx.font = fontStr(ts, t.titleFont, { italic: t.titleItalic, weight: t.titleWeight || 400 });
  while (ctx.measureText(title).width > W - 2 * M && ts > 4 * u) { ts *= 0.92; ctx.font = fontStr(ts, t.titleFont, { italic: t.titleItalic, weight: t.titleWeight || 400 }); }
  ctx.fillText(title, W / 2, y);
  y += Math.max(4.6 * u, ts * (/Pinyon|Caveat/.test(t.titleFont) ? 0.58 : 0.3)); ctx.fillStyle = accent; ctx.font = fontStr(1.9 * u, '"Inter", sans-serif', { weight: 700 });
  drawTracked(ctx, 'GOALS  ·  INTENTIONS  ·  CHECK-INS', W / 2, y, 0.25, 1.9 * u);
  const word = state.word || defaultWord('en', state.seed || 1);
  if (word) { y += 5.4 * u; ctx.fillStyle = ink; ctx.font = fontStr(3.6 * u, '"Instrument Serif", serif', { italic: true }); ctx.fillText('word of the year: ' + word, W / 2, y); }
  // goal boxes
  y += 5 * u;
  const goals = (state.goals.length ? state.goals : ['travel', 'money', 'selfcare', 'home']).slice(0, 6);
  const custom = (state.custom || []).filter((c) => c.trim());
  const cols = 2, bw = (W - 2 * M - 3 * u) / cols, rows = Math.ceil(goals.length / cols);
  const monthsH = 17 * u, footer = 6 * u;
  const bh = Math.min(34 * u, (H - y - monthsH - footer - M - (rows - 1) * 3 * u) / rows);
  let ci = 0;
  goals.forEach((g, i) => {
    const bx = M + (i % cols) * (bw + 3 * u), by = y + Math.floor(i / cols) * (bh + 3 * u);
    ctx.save(); rr(ctx, bx, by, bw, bh, 2.4 * u); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 0.22 * u; ctx.strokeStyle = 'rgba(42,36,33,0.14)'; ctx.stroke(); ctx.restore();
    const cat = CATEGORIES.find((c) => c.id === g); const name = (cat ? cat.en : g).toUpperCase();
    ctx.textAlign = 'left'; ctx.fillStyle = accent; ctx.font = fontStr(1.9 * u, '"Inter", sans-serif', { weight: 700 });
    drawTracked(ctx, name, bx + 3 * u, by + 5 * u, 0.2, 1.9 * u);
    const lines = 4, lh = (bh - 9 * u) / lines;
    const affs = AFFIRMATIONS[g]?.en || [];
    for (let k = 0; k < lines; k++) {
      const ly = by + 8.5 * u + k * lh + lh * 0.55;
      ctx.lineWidth = 0.22 * u; ctx.strokeStyle = 'rgba(42,36,33,0.55)'; rr(ctx, bx + 3 * u, ly - 1.7 * u, 2.2 * u, 2.2 * u, 0.45 * u); ctx.stroke();
      let text = '';
      if (k === 0) text = custom[ci] ? custom[ci++] : (affs[(state.seed || 1) % Math.max(1, affs.length)] || '');
      if (text) {
        ctx.fillStyle = ink; let fs = 2.5 * u; ctx.font = fontStr(fs, '"Instrument Serif", serif');
        while (ctx.measureText(text).width > bw - 9 * u && fs > 1.4 * u) { fs *= 0.93; ctx.font = fontStr(fs, '"Instrument Serif", serif'); }
        ctx.fillText(text, bx + 6.6 * u, ly);
      } else { ctx.strokeStyle = 'rgba(42,36,33,0.16)'; ctx.beginPath(); ctx.moveTo(bx + 6.6 * u, ly + 0.4 * u); ctx.lineTo(bx + bw - 3 * u, ly + 0.4 * u); ctx.stroke(); }
    }
  });
  // monthly check-in
  const my = H - M - footer - monthsH + 4 * u;
  ctx.textAlign = 'center'; ctx.fillStyle = accent; ctx.font = fontStr(1.9 * u, '"Inter", sans-serif', { weight: 700 });
  drawTracked(ctx, 'MONTHLY CHECK-IN', W / 2, my, 0.25, 1.9 * u);
  const mm = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], step = (W - 2 * M) / 12;
  mm.forEach((m, i) => { const cx = M + step * (i + 0.5), cy = my + 6.5 * u; ctx.beginPath(); ctx.arc(cx, cy, 2.6 * u, 0, Math.PI * 2); ctx.lineWidth = 0.22 * u; ctx.strokeStyle = 'rgba(42,36,33,0.4)'; ctx.stroke(); ctx.fillStyle = soft; ctx.font = fontStr(1.9 * u, '"Inter", sans-serif', { weight: 600 }); ctx.fillText(m, cx, cy + 0.7 * u); });
  ctx.fillStyle = soft; ctx.font = fontStr(1.5 * u, '"Inter", sans-serif', { weight: 500 }); ctx.fillText('made with glowboard · 2027', W / 2, H - M + 1 * u);
}

// ---------- matching home screen (Pro) ----------
export async function renderHome(canvas, state, W = 1179, H = 2556) {
  let t = themeById(state.themeId);
  if (state.font && TITLE_FONTS[state.font]) t = { ...t, ...TITLE_FONTS[state.font] };
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); const u = W / 100;
  // tiny render, then upscale in 2 steps = smooth blur that works in every browser (no ctx.filter)
  const src = document.createElement('canvas');
  await renderBoard(src, { ...state, clockSafe: false }, { width: 200, height: Math.round(200 * H / W), watermark: false });
  const step = (from, w) => { const c = document.createElement('canvas'); c.width = w; c.height = Math.max(1, Math.round(w * H / W)); const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(from, 0, 0, c.width, c.height); return c; };
  let c = step(step(step(src, 60), 18), 9);
  c = step(step(c, 40), 160);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c, -W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
  // wash with the theme background so app icons stay readable
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const bg0 = t.bg[0], bg1 = t.bg[t.bg.length - 1];
  ctx.globalAlpha = 0.3; g.addColorStop(0, bg0); g.addColorStop(1, bg1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  drawGrain(ctx, { grain: (t.grain || 0.03) + 0.02 }, W, H);
  // word of the year, low on the screen above the dock
  const word = (state.word || defaultWord('en', state.seed || 1)).trim();
  const dark = /^#([0-9a-f]{6})$/i.test(bg0) && (() => { const n = parseInt(bg0.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < 0.45; })();
  ctx.textAlign = 'center'; ctx.fillStyle = dark ? 'rgba(255,255,255,0.92)' : 'rgba(30,24,20,0.82)';
  ctx.shadowColor = dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.5)'; ctx.shadowBlur = u * 2;
  const fs = 12 * u * (t.titleScale || 1);
  ctx.font = fontStr(fs, t.titleFont, { italic: t.titleItalic, weight: t.titleWeight || 400 });
  ctx.fillText((state.title || '2027').trim() || '2027', W / 2, H * 0.78);
  ctx.font = fontStr(4.6 * u, '"Instrument Serif", serif', { italic: true });
  ctx.fillText(word, W / 2, H * 0.78 + 7.5 * u);
  ctx.shadowBlur = 0;
}

// ---------- widget pack (Pro): square / wide tiles for iOS & Android photo widgets ----------
export function renderWidget(canvas, state, text, W = 1024, H = 1024, seed = 1, eyebrow = '') {
  const t = themeById(state.themeId);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); const r = rng(seed * 97 + 3); const u = Math.min(W, H) / 100;
  drawBackground(ctx, t, W, H, r);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const gold = t.titleGold ? '#E8CF98' : t.ink;
  ctx.fillStyle = t.ink; ctx.globalAlpha = 0.65;
  ctx.font = fontStr(u * 4.2, '"Inter", sans-serif', { weight: 600 });
  drawTracked(ctx, (eyebrow || ((state.title || '2027').trim() || '2027')).toUpperCase(), W / 2, H * 0.2, 0.3, u * 4.2);
  ctx.globalAlpha = 1;
  let size = u * (W > H * 1.5 ? 22 : 13) * (t.textScale || 1);
  const fo = { weight: t.textWeight || 400, italic: t.wordItalic && !t.textWeight };
  let lines;
  for (let k = 0; k < 30; k++) { ctx.font = fontStr(size, t.textFont, fo); lines = wrap(ctx, text, W * 0.8); if (lines.length <= 3 && lines.every((l) => ctx.measureText(l).width <= W * 0.84)) break; size *= 0.92; }
  const lh = size * 1.12; const y0 = H * 0.54 - (lines.length - 1) * lh / 2;
  ctx.fillStyle = gold;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh));
  for (let i = 0; i < 3; i++) sticker(ctx, t.stickers[i % t.stickers.length], W * (0.12 + r() * 0.76), i === 0 ? H * 0.1 : H * (0.84 + r() * 0.06), u * (2.4 + r() * 2), t.stickerColors[i % t.stickerColors.length], (r() - 0.5) * 0.6);
  drawGrain(ctx, t, W, H);
  return canvas;
}
