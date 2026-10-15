'use strict';
// Tüm grafikler kodla çiziliyor: karakter sprite'ları, karolar, binalar, mobilyalar.

const ART = {};
const TS = 16; // karo boyutu (piksel)

ART.canvas = function (w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
};

ART.shade = function (hex, amt) {
  let n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return '#' + [r, g, b].map((v) => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
};

// Opak piksellerin çevresine koyu bir kontur çizer (Stardew tarzı görünüm için).
ART.outline = function (c, color) {
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  const src = g.getImageData(0, 0, w, h);
  const d = src.data;
  const out = g.createImageData(w, h);
  const o = out.data;
  const n = parseInt(color.slice(1), 16);
  const cr = (n >> 16) & 255, cg = (n >> 8) & 255, cb = n & 255;
  const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
        const i = (y * w + x) * 4;
        o[i] = cr; o[i + 1] = cg; o[i + 2] = cb; o[i + 3] = 230;
      }
    }
  }
  const [tmp, tg] = ART.canvas(w, h);
  tg.putImageData(out, 0, 0);
  g.drawImage(tmp, 0, 0);
};

// Piksel daire (yumuşatmasız)
function pcirc(g, cx, cy, rx, ry, col) {
  g.fillStyle = col;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
    }
  }
}

// ---------------------------------------------------------------------------------
// Karakterler: 16x24 kare, 4 yön x 3 kare (0: dur, 1-2: yürüme)
// ---------------------------------------------------------------------------------
ART.CW = 16; ART.CH = 24;

function drawCharFrame(g, s, dir, f) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const skin = s.skin, skinD = ART.shade(skin, -0.18);
  const hair = s.hair, hairD = ART.shade(hair, -0.25), hairL = ART.shade(hair, 0.3);
  const top = s.top;
  const coat = s.jacket || top;
  const coatD = ART.shade(coat, -0.22);
  const bottom = s.bottom || '#3b3f4a';
  const shoes = s.shoes || '#2d2a2a';
  const eye = '#2a1c1c';
  const lA = f === 1 ? 1 : 0, lB = f === 2 ? 1 : 0; // kaldırılan bacak

  if (dir === 0 || dir === 1) {
    // Bacaklar
    if (s.dress) {
      R(5, 19, 2, 3 - lA, skinD); R(9, 19, 2, 3 - lB, skinD);
      R(5, 22 - lA, 2, 1, shoes); R(9, 22 - lB, 2, 1, shoes);
      R(4, 15, 8, 5, bottom); R(4, 19, 8, 1, ART.shade(bottom, -0.25));
    } else {
      R(5, 17, 2, 5 - lA, bottom); R(9, 17, 2, 5 - lB, bottom);
      R(5, 17, 1, 5 - lA, ART.shade(bottom, -0.15));
      R(5, 22 - lA, 2, 1, shoes); R(9, 22 - lB, 2, 1, shoes);
    }
    // Gövde
    R(4, 10, 8, 7, coat);
    R(4, 10, 1, 7, coatD);
    if (dir === 0) {
      if (s.jacket) {
        R(6, 10, 4, 6, s.vest || top);
        if (s.vest) { R(7, 10, 2, 2, top); R(7, 13, 1, 1, ART.shade(s.vest, -0.3)); R(7, 15, 1, 1, ART.shade(s.vest, -0.3)); }
        else R(7, 10, 2, 6, top);
      }
      if (s.apron) { R(5, 12, 6, 6, s.apron); R(5, 11, 1, 1, s.apron); R(10, 11, 1, 1, s.apron); }
    }
    if (!s.dress) R(4, 16, 8, 1, ART.shade(bottom, -0.35));
    // Kollar
    const aL = f === 1 ? 1 : 0, aR = f === 2 ? 1 : 0;
    R(3, 10 + aL, 1, 6, coat); R(3, 16 + aL, 1, 1, skin);
    R(12, 10 + aR, 1, 6, coatD); R(12, 16 + aR, 1, 1, skin);
    // Boyun + kafa
    R(7, 9, 2, 1, skinD);
    R(4, 2, 8, 7, skin); R(5, 1, 6, 1, skin);
    R(3, 5, 1, 2, skin); R(12, 5, 1, 2, skin);
    if (dir === 0) {
      R(4, 8, 8, 1, ART.shade(skin, -0.08));
      R(6, 5, 1, 2, eye); R(9, 5, 1, 2, eye);
      R(6, 5, 1, 1, '#5b4a4a');
      R(7, 7, 2, 1, ART.shade(skin, -0.3));
      if (s.female) { R(5, 7, 1, 1, '#e89a8a'); R(10, 7, 1, 1, '#e89a8a'); R(6, 4, 1, 1, eye); R(9, 4, 1, 1, eye); }
      if (s.beard) { R(4, 6, 1, 3, s.beard); R(11, 6, 1, 3, s.beard); R(5, 8, 6, 1, s.beard); R(6, 7, 1, 1, s.beard); R(9, 7, 1, 1, s.beard); }
      if (s.glasses) { R(5, 5, 2, 1, '#1b1b1b'); R(9, 5, 2, 1, '#1b1b1b'); R(7, 5, 2, 1, '#1b1b1b'); }
    }
    // Saç
    const st = s.hairStyle;
    if (dir === 0) {
      if (st === 'curly') {
        R(3, 0, 10, 4, hair); R(4, -1, 8, 1, hair);
        R(3, 4, 1, 3, hair); R(12, 4, 1, 3, hair);
        R(4, 4, 1, 1, hair); R(6, 4, 1, 1, hair); R(9, 4, 1, 1, hair); R(11, 4, 1, 1, hair);
        [[4, 1], [7, 0], [10, 1], [5, 2], [9, 2], [12, 2], [3, 3]].forEach(([x, y]) => R(x, y, 1, 1, hairL));
        [[6, 1], [11, 3], [8, 2]].forEach(([x, y]) => R(x, y, 1, 1, hairD));
      } else if (st === 'long') {
        R(4, 1, 8, 3, hair); R(3, 2, 1, 10, hair); R(12, 2, 1, 10, hair);
        R(4, 4, 1, 4, hair); R(11, 4, 1, 4, hair); R(5, 0, 6, 1, hair); R(5, 4, 2, 1, hair);
        R(4, 9, 1, 3, hairD); R(11, 9, 1, 3, hairD); R(6, 1, 3, 1, hairL);
      } else if (st === 'bun') {
        R(4, 1, 8, 3, hair); R(3, 2, 1, 4, hair); R(12, 2, 1, 4, hair); R(6, -1, 4, 2, hairD); R(5, 0, 6, 1, hair);
      } else if (st === 'ponytail') {
        R(4, 1, 8, 3, hair); R(3, 2, 1, 4, hair); R(12, 2, 1, 4, hair); R(5, 0, 6, 1, hair); R(4, 4, 2, 1, hair); R(12, 6, 1, 4, hairD);
      } else if (st === 'bald') {
        R(3, 3, 1, 3, hair); R(12, 3, 1, 3, hair); R(4, 3, 1, 1, hair); R(11, 3, 1, 1, hair); R(6, 2, 2, 1, ART.shade(skin, 0.25));
      } else if (st === 'slick') {
        R(4, 1, 8, 2, hair); R(3, 2, 1, 3, hair); R(12, 2, 1, 3, hair); R(5, 0, 6, 1, hair); R(9, 3, 3, 1, hair); R(6, 1, 2, 1, hairL);
      } else { // short
        R(4, 1, 8, 3, hair); R(3, 2, 1, 3, hair); R(12, 2, 1, 3, hair); R(5, 0, 6, 1, hair);
        R(4, 4, 1, 1, hair); R(11, 4, 1, 1, hair); R(7, 1, 3, 1, hairL);
      }
    } else {
      // Arkadan görünüm
      if (st === 'bald') { R(4, 1, 8, 7, skin); R(3, 4, 10, 3, hair); R(6, 2, 2, 1, ART.shade(skin, 0.25)); }
      else {
        R(3, 1, 10, 8, hair); R(4, 0, 8, 1, hair);
        if (st === 'curly') [[4, 1], [7, 2], [10, 1], [5, 4], [9, 5], [12, 3], [6, 6], [3, 5]].forEach(([x, y]) => R(x, y, 1, 1, hairL));
        if (st === 'long') { R(3, 9, 10, 4, hair); R(4, 12, 8, 1, hairD); }
        if (st === 'bun') R(6, -1, 4, 3, hairD);
        if (st === 'ponytail') R(7, 9, 2, 5, hairD);
        R(4, 8, 8, 1, hairD);
      }
    }
    if (s.cap) { R(3, 0, 10, 3, s.cap); if (dir === 0) R(3, 3, 10, 1, ART.shade(s.cap, -0.3)); }
  } else {
    // Sol profil (sağ, aynalanarak üretilir)
    if (s.dress) {
      R(6, 19, 2, 3, skinD); R(8, 19, 2, 3, skinD);
      R(f === 1 ? 5 : 6, 22, 2, 1, shoes); R(f === 2 ? 9 : 8, 22, 2, 1, shoes);
      R(4, 15, 8, 5, bottom); R(4, 19, 8, 1, ART.shade(bottom, -0.25));
    } else if (f === 0) {
      R(6, 17, 4, 5, bottom); R(5, 22, 5, 1, shoes); R(8, 17, 1, 5, ART.shade(bottom, -0.15));
    } else {
      const fwd = f === 1;
      R(fwd ? 4 : 5, 17, 2, 5, bottom); R(fwd ? 8 : 9, 17, 2, 5, ART.shade(bottom, -0.15));
      R(fwd ? 3 : 4, 22, 3, 1, shoes); R(fwd ? 8 : 9, 22, 3, 1, shoes);
    }
    R(5, 10, 6, 7, coat); R(10, 10, 1, 7, coatD);
    if (s.jacket) R(5, 10, 1, 4, top);
    if (s.apron && !s.dress) R(4, 12, 2, 6, s.apron);
    if (!s.dress) R(5, 16, 6, 1, ART.shade(bottom, -0.35));
    const sw = f === 1 ? -1 : f === 2 ? 1 : 0;
    R(7 + sw, 10, 2, 6, coatD); R(7 + sw, 16, 2, 1, skin);
    R(7, 9, 2, 1, skinD);
    R(4, 2, 8, 7, skin); R(5, 1, 6, 1, skin); R(3, 5, 1, 2, skin);
    R(5, 5, 1, 2, eye); R(4, 7, 2, 1, ART.shade(skin, -0.3));
    if (s.glasses) R(3, 5, 4, 1, '#1b1b1b');
    if (s.beard) { R(4, 7, 5, 2, s.beard); R(4, 7, 2, 1, ART.shade(skin, -0.3)); }
    const st = s.hairStyle;
    if (st === 'bald') { R(8, 3, 4, 4, hair); R(6, 2, 2, 1, ART.shade(skin, 0.25)); }
    else {
      R(4, 1, 8, 3, hair); R(7, 3, 5, 5, hair); R(5, 0, 6, 1, hair);
      if (st === 'curly') { R(3, 0, 9, 4, hair); R(11, 4, 2, 4, hair); [[4, 1], [8, 0], [10, 2], [9, 5], [11, 6]].forEach(([x, y]) => R(x, y, 1, 1, hairL)); R(4, 4, 1, 1, hair); }
      if (st === 'long') { R(8, 7, 4, 6, hair); R(9, 12, 3, 1, hairD); }
      if (st === 'bun') R(10, 0, 3, 3, hairD);
      if (st === 'ponytail') R(11, 5, 2, 6, hairD);
      if (st === 'short' || st === 'slick') R(4, 3, 1, 1, hair);
    }
    R(8, 5, 1, 2, skin); // kulak
    if (s.cap) { R(3, 0, 9, 3, s.cap); R(2, 3, 4, 1, ART.shade(s.cap, -0.3)); }
  }
}

const charCache = new Map();
// Sprite sayfası: 3 kare x 4 yön (aşağı, yukarı, sol, sağ). Kontur dahil 18x26 hücre.
ART.charSheet = function (spec) {
  const key = JSON.stringify(spec);
  if (charCache.has(key)) return charCache.get(key);
  const CW = 18, CH = 26;
  const [c, g] = ART.canvas(CW * 3, CH * 4);
  for (let dir = 0; dir < 4; dir++) {
    for (let f = 0; f < 3; f++) {
      const [fc, fg] = ART.canvas(CW, CH);
      fg.save();
      fg.translate(1, 2);
      if (dir === 3) { fg.translate(16, 0); fg.scale(-1, 1); }
      drawCharFrame(fg, spec, dir === 3 ? 2 : dir, f);
      fg.restore();
      ART.outline(fc, '#2b1d1a');
      g.drawImage(fc, f * CW, dir * CH);
    }
  }
  const sheet = { img: c, cw: CW, ch: CH };
  charCache.set(key, sheet);
  return sheet;
};

// Diyalog portresi: kafa bölgesi büyütülmüş
ART.portrait = function (canvas, spec) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  const sheet = ART.charSheet(spec);
  const scale = Math.floor(canvas.width / 18);
  g.drawImage(sheet.img, 0, 0, 18, 17, (canvas.width - 18 * scale) / 2, canvas.height - 17 * scale, 18 * scale, 17 * scale);
};

// ---------------------------------------------------------------------------------
// Doğa sprite'ları
// ---------------------------------------------------------------------------------
ART.tree = function (variant) {
  const [c, g] = ART.canvas(34, 42);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (variant === 2) { // çam
    R(15, 32, 4, 9, '#6b4a2b');
    const cols = ['#2f6b3a', '#3a7d45', '#4b9254'];
    for (let i = 0; i < 4; i++) {
      const top = 4 + i * 7, w = 8 + i * 6;
      for (let r = 0; r < 10; r++) {
        const ww = Math.round(w * (r + 1) / 10);
        R(17 - ww, top + r, ww * 2, 1, cols[(r + i) % 3 === 0 ? 2 : r < 3 ? 1 : 0]);
      }
    }
  } else {
    R(14, 28, 6, 13, '#6b4a2b'); R(14, 28, 2, 13, '#5a3d22'); R(12, 39, 10, 2, '#5a3d22');
    const base = variant === 1 ? '#5c9c3c' : '#3f8a3e';
    pcirc(g, 17, 17, 15, 13, ART.shade(base, -0.25));
    pcirc(g, 16, 15, 13.5, 11.5, base);
    pcirc(g, 12, 11, 7, 6, ART.shade(base, 0.18));
    pcirc(g, 22, 18, 5, 4, ART.shade(base, 0.08));
    if (variant === 1) [[10, 18], [20, 10], [24, 20], [14, 22]].forEach(([x, y]) => { R(x, y, 2, 2, '#e05a4f'); R(x, y, 1, 1, '#ff9a8a'); });
  }
  ART.outline(c, '#24331f');
  return c;
};

ART.bush = function () {
  const [c, g] = ART.canvas(18, 16);
  pcirc(g, 9, 9, 8, 6.5, '#3b7d38');
  pcirc(g, 8, 8, 6, 5, '#4f9a45');
  pcirc(g, 6, 6, 2.5, 2, '#6bb85a');
  ART.outline(c, '#24331f');
  return c;
};

ART.lamp = function () {
  const [c, g] = ART.canvas(10, 34);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(4, 8, 2, 24, '#2d3138'); R(3, 30, 4, 3, '#2d3138');
  R(2, 2, 6, 6, '#2d3138'); R(3, 3, 4, 4, '#ffe9a8'); R(1, 1, 8, 1, '#2d3138');
  return c;
};

ART.bench = function () {
  const [c, g] = ART.canvas(32, 18);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(2, 2, 28, 3, '#8a5a32'); R(2, 6, 28, 3, '#8a5a32'); R(2, 10, 28, 3, '#9b6a3e');
  R(4, 13, 2, 4, '#3a3a3a'); R(26, 13, 2, 4, '#3a3a3a');
  ART.outline(c, '#3a2414');
  return c;
};

ART.vine = function () {
  const [c, g] = ART.canvas(16, 26);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(7, 4, 2, 21, '#7a5a3a');
  pcirc(g, 8, 11, 7, 7, '#4c8c3c'); pcirc(g, 6, 9, 3, 3, '#64a64e');
  [[4, 13], [9, 15], [11, 10], [6, 17]].forEach(([x, y]) => { R(x, y, 3, 3, '#6b2d6b'); R(x, y, 1, 1, '#a35ca3'); });
  ART.outline(c, '#24331f');
  return c;
};

// Jade'in klasik arabası (eski bir sedan) — 2 karo genişlik
ART.car = function () {
  const [c, g] = ART.canvas(36, 22);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const body = '#9fb4c4', dark = '#7a8fa0';
  R(3, 9, 30, 8, body); R(2, 11, 32, 5, body); R(9, 3, 16, 7, body);
  R(11, 4, 5, 5, '#3d5566'); R(18, 4, 5, 5, '#3d5566'); R(12, 4, 2, 2, '#7fa3b8');
  R(2, 15, 32, 2, dark); R(3, 12, 30, 1, '#e8eef2');
  R(32, 11, 2, 2, '#ffe9a8'); R(2, 11, 2, 2, '#c94a4a');
  pcirc(g, 9, 17, 3.2, 3.2, '#222'); pcirc(g, 27, 17, 3.2, 3.2, '#222');
  R(8, 16, 2, 2, '#888'); R(26, 16, 2, 2, '#888');
  ART.outline(c, '#1f2a33');
  return c;
};

ART.sparkle = function (t, hiddenFound) {
  const [c, g] = ART.canvas(16, 16);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const k = Math.floor(t * 6) % 4;
  const col = hiddenFound ? '#c9a6ff' : '#fff6b0';
  const s = [3, 5, 6, 5][k];
  R(8 - s, 7, s * 2, 2, col); R(7, 8 - s, 2, s * 2, col); R(7, 7, 2, 2, '#ffffff');
  return c;
};

// ---------------------------------------------------------------------------------
// Zemin karoları (şehir haritası zemin tuvaline doğrudan çizilir)
// ---------------------------------------------------------------------------------
ART.groundTile = function (g, type, px, py, r, ctx) {
  // Karonun dışına taşmayı önlemek için kırpılmış dikdörtgen
  const R = (x, y, w, h, col) => {
    const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(16, x + w), y1 = Math.min(16, y + h);
    if (x1 <= x0 || y1 <= y0) return;
    g.fillStyle = col; g.fillRect(px + x0, py + y0, x1 - x0, y1 - y0);
  };
  switch (type) {
    case 'grass': {
      R(0, 0, 16, 16, '#6fae46');
      for (let i = 0; i < 6; i++) R(r.int(0, 15), r.int(0, 15), 1, 2, '#5f9c3b');
      for (let i = 0; i < 3; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, '#88c45c');
      break;
    }
    case 'flowers': {
      ART.groundTile(g, 'grass', px, py, r);
      const cols = ['#f2e35b', '#f07fa6', '#ffffff', '#9fc2ff'];
      for (let i = 0; i < 4; i++) { const x = r.int(1, 13), y = r.int(1, 13); R(x, y, 2, 2, r.pick(cols)); R(x, y + 2, 1, 1, '#3f7d2d'); }
      break;
    }
    case 'road': {
      R(0, 0, 16, 16, '#c2ad8a');
      const offs = (ctx && ctx.y % 2) ? 4 : 0;
      for (let y = 0; y < 16; y += 8) for (let x = -8; x < 16; x += 8) {
        const xx = x + ((y / 8) % 2 ? 4 : 0) + offs;
        R(xx + 1, y + 1, 6, 6, (xx + y) % 3 ? '#cdb996' : '#bba483');
        R(xx + 1, y + 6, 6, 1, '#a8916f');
      }
      break;
    }
    case 'sand': {
      R(0, 0, 16, 16, '#e1cd95');
      for (let i = 0; i < 5; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, '#cdb779');
      break;
    }
    case 'water': {
      R(0, 0, 16, 16, '#3f7fc4');
      for (let i = 0; i < 3; i++) R(r.int(0, 12), r.int(0, 15), 4, 1, '#6aa3db');
      break;
    }
    case 'plank': {
      R(0, 0, 16, 16, '#9a6b3e');
      for (let y = 0; y < 16; y += 4) R(0, y, 16, 1, '#7a5230');
      R(r.int(0, 15), r.int(0, 15), 1, 1, '#5e3e22');
      break;
    }
    case 'soil': {
      R(0, 0, 16, 16, '#8a6a46');
      for (let i = 0; i < 6; i++) R(r.int(0, 15), r.int(0, 15), 2, 1, '#77593a');
      break;
    }
    case 'plaza': {
      R(0, 0, 16, 16, '#d6cbb5');
      R(0, 0, 16, 1, '#bfb39b'); R(0, 0, 1, 16, '#bfb39b'); R(8, 0, 1, 16, '#c9bea7'); R(0, 8, 16, 1, '#c9bea7');
      break;
    }
  }
};

// ---------------------------------------------------------------------------------
// Binalar
// ---------------------------------------------------------------------------------
const BSTYLE = {
  station: { roof: '#3e4a5e', wall: '#b9c3cf', trim: '#2c3442', door: '#2c3a55', icon: 'badge', brick: true },
  lab: { roof: '#3f8a86', wall: '#e9edee', trim: '#9aa8ab', door: '#5d7f8a', icon: 'cross' },
  cafe: { roof: '#9b4a2e', wall: '#efd9b0', trim: '#7a4a2a', door: '#7a4a2a', icon: 'cup', awning: ['#d24a3a', '#f3efe6'] },
  hotel: { roof: '#7a2f3a', wall: '#e7c9a3', trim: '#8a6a3a', door: '#6b2a2a', icon: 'bed', tall: true },
  bar: { roof: '#a33a2e', wall: '#8a5a3a', trim: '#4b2e1c', door: '#3b2214', icon: 'boat', plank: true },
  gallery: { roof: '#e8e8e8', wall: '#f7f7f4', trim: '#333', door: '#333', icon: 'palette', glass: true },
  mansion: { roof: '#4b3a5e', wall: '#efe7d6', trim: '#8a7a5a', door: '#5a3a24', icon: 'crown', columns: true },
  vineyard: { roof: '#8a4b2e', wall: '#d9b98a', trim: '#6b4a2b', door: '#5a3a24', icon: 'grape', stone: true },
  warehouse: { roof: '#6b7680', wall: '#8f9aa3', trim: '#4b555e', door: '#5c6670', icon: 'anchor', metal: true, bigdoor: true },
  house1: { roof: '#3f5f8a', wall: '#a9c7e3', trim: '#2f4a6b', door: '#7a4a2a', icon: null },
  house2: { roof: '#a3762e', wall: '#f2dd8a', trim: '#8a6a2a', door: '#5a8a4a', icon: null },
};

function drawIcon(g, icon, x, y) {
  const R = (a, b, w, h, col) => { g.fillStyle = col; g.fillRect(x + a, y + b, w, h); };
  switch (icon) {
    case 'badge': R(2, 1, 6, 6, '#e8c35a'); R(3, 7, 4, 1, '#e8c35a'); R(4, 3, 2, 2, '#8a6a2a'); break;
    case 'cross': R(4, 1, 2, 7, '#d23a3a'); R(1, 3, 8, 2, '#d23a3a'); break;
    case 'cup': R(2, 3, 5, 4, '#fff'); R(7, 4, 1, 2, '#fff'); R(3, 1, 1, 1, '#ccc'); R(5, 0, 1, 2, '#ccc'); break;
    case 'bed': R(1, 4, 8, 3, '#fff'); R(1, 3, 2, 2, '#9fc2ff'); R(1, 7, 1, 1, '#fff'); R(8, 7, 1, 1, '#fff'); break;
    case 'boat': R(1, 5, 8, 2, '#d23a3a'); R(2, 7, 6, 1, '#d23a3a'); R(5, 1, 1, 4, '#fff'); R(6, 2, 2, 2, '#fff'); break;
    case 'palette': R(1, 2, 8, 5, '#e8d2a8'); R(2, 3, 1, 1, '#d23a3a'); R(4, 3, 1, 1, '#3a6ad2'); R(6, 3, 1, 1, '#e8c35a'); R(3, 5, 1, 1, '#3aa04a'); break;
    case 'crown': R(1, 3, 8, 4, '#e8c35a'); R(1, 1, 1, 2, '#e8c35a'); R(4, 1, 2, 2, '#e8c35a'); R(8, 1, 1, 2, '#e8c35a'); break;
    case 'grape': [[3, 2], [5, 2], [2, 4], [4, 4], [6, 4], [3, 6], [5, 6]].forEach(([a, b]) => R(a, b, 2, 2, '#7a3a8a')); R(5, 0, 1, 2, '#3a7a3a'); break;
    case 'anchor': R(4, 1, 2, 6, '#ddd'); R(2, 2, 6, 1, '#ddd'); R(1, 6, 8, 1, '#ddd'); R(1, 5, 1, 1, '#ddd'); R(8, 5, 1, 1, '#ddd'); break;
  }
}

ART.building = function (b) {
  const st = BSTYLE[b.style];
  const W = b.w * TS, H = b.h * TS;
  const [c, g] = ART.canvas(W + 4, H + 6);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x + 2, y + 6, w, h); };
  const roofH = Math.round(H * (st.tall ? 0.32 : 0.42));
  const wallY = roofH;
  const wallH = H - roofH;
  // Duvar
  R(0, wallY, W, wallH, st.wall);
  if (st.brick || st.stone) {
    for (let y = wallY + 2; y < H; y += 5) for (let x = (y % 10 ? 0 : 5); x < W; x += 10) R(x, y, 8, 1, ART.shade(st.wall, -0.08));
  }
  if (st.plank) for (let x = 0; x < W; x += 5) R(x, wallY, 1, wallH, ART.shade(st.wall, -0.18));
  if (st.metal) for (let x = 0; x < W; x += 3) R(x, wallY, 1, wallH, ART.shade(st.wall, x % 6 ? -0.12 : 0.12));
  R(0, H - 3, W, 3, ART.shade(st.wall, -0.3));
  R(0, wallY, W, 2, ART.shade(st.wall, -0.2));
  // Pencereler
  const doorX = Math.floor(b.w / 2) * TS;
  b.windows = [];
  const rows = st.tall ? 2 : 1;
  for (let r0 = 0; r0 < rows; r0++) {
    const wy = wallY + 6 + r0 * Math.floor((wallH - 10) / rows);
    for (let tx = 0; tx < b.w; tx++) {
      const x = tx * TS;
      if (Math.abs(x - doorX) < TS * 1.2 && r0 === rows - 1) continue;
      if ((tx % 2) !== (b.w % 2 ? 0 : 1) && !st.glass) continue;
      if (tx === 0 || tx === b.w - 1) continue;
      if (st.glass) {
        R(x + 1, wy, 14, wallH - 12, '#2f3a44'); R(x + 2, wy + 1, 12, wallH - 14, '#9cc6dc'); R(x + 3, wy + 2, 3, 4, '#d6eef8');
      } else {
        R(x + 2, wy, 12, 11, st.trim); R(x + 3, wy + 1, 10, 9, '#9cc6dc'); R(x + 3, wy + 5, 10, 1, st.trim); R(x + 7, wy + 1, 1, 9, st.trim); R(x + 4, wy + 2, 2, 2, '#d6eef8');
        if (st.awning) for (let i = 0; i < 14; i += 2) R(x + 1 + i, wy - 4, 2, 4, st.awning[(i / 2) % 2]);
      }
      b.windows.push({ x: b.x * TS + x + 8, y: b.y * TS + wy + 5 });
    }
  }
  // Sütunlar
  if (st.columns) {
    [doorX - 14, doorX + 26].forEach((x) => { R(x, wallY + 2, 4, wallH - 5, '#f7f3ea'); R(x, wallY + 2, 1, wallH - 5, '#d8d0c0'); });
  }
  // Kapı
  if (st.bigdoor) {
    R(doorX - 6, H - 28, 28, 25, ART.shade(st.door, -0.2));
    for (let y = H - 27; y < H - 3; y += 3) R(doorX - 5, y, 26, 1, ART.shade(st.door, 0.15));
  }
  R(doorX + 1, H - 19, 14, 16, st.trim);
  R(doorX + 2, H - 18, 12, 15, st.door);
  R(doorX + 3, H - 17, 4, 6, ART.shade(st.door, 0.15)); R(doorX + 9, H - 17, 4, 6, ART.shade(st.door, 0.15));
  R(doorX + 11, H - 10, 2, 2, '#e8c35a');
  // Tabela
  if (st.icon) {
    R(doorX - 1, H - 31, 18, 11, ART.shade(st.trim, -0.2));
    R(doorX, H - 30, 16, 9, st.trim);
    drawIcon(g, st.icon, doorX + 5 + 2, H - 30 + 6 - 6 + 0);
  }
  // Çatı
  R(-0, 0, W, roofH, st.roof);
  for (let y = 3; y < roofH; y += 4) {
    R(0, y, W, 1, ART.shade(st.roof, -0.18));
    for (let x = (y % 8 ? 0 : 4); x < W; x += 8) R(x, y - 3, 1, 3, ART.shade(st.roof, -0.1));
  }
  R(0, 0, W, 2, ART.shade(st.roof, 0.2));
  R(0, roofH - 2, W, 2, ART.shade(st.roof, -0.35));
  R(-2, roofH - 1, W + 4, 1, ART.shade(st.roof, -0.45));
  if (b.style === 'station') { R(W / 2 - 1, -6, 2, 8, '#555'); R(W / 2 + 1, -6, 8, 5, '#3a6ad2'); R(W / 2 + 1, -6, 8, 1, '#d23a3a'); }
  if (b.style === 'warehouse' || b.style === 'hotel' || b.style === 'mansion') { R(W - 24, -4, 8, 6, ART.shade(st.roof, -0.3)); R(W - 23, -5, 6, 2, '#666'); }
  ART.outline(c, '#2b1d1a');
  return c;
};

// ---------------------------------------------------------------------------------
// İç mekân: zemin, duvar, mobilyalar
// ---------------------------------------------------------------------------------
ART.floor = function (g, kind, colors, px, py, r, tx, ty) {
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(px + x, py + y, w, h); };
  const a = colors[0], b = colors[1] || ART.shade(a, -0.12);
  switch (kind) {
    case 'wood':
      R(0, 0, 16, 16, a);
      for (let y = 0; y < 16; y += 4) R(0, y, 16, 1, b);
      R(((ty * 5) % 16), 1, 1, 3, b); R(((ty * 11 + 7) % 16), 5, 1, 3, b); R(((ty * 3 + 2) % 16), 9, 1, 3, b); R(((ty * 7 + 12) % 16), 13, 1, 3, b);
      break;
    case 'tile':
      R(0, 0, 16, 16, a); R(0, 0, 16, 1, b); R(0, 0, 1, 16, b);
      break;
    case 'checker':
      R(0, 0, 16, 16, (tx + ty) % 2 ? a : b);
      break;
    case 'carpet':
      R(0, 0, 16, 16, a);
      for (let i = 0; i < 4; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, b);
      break;
    case 'concrete':
      R(0, 0, 16, 16, a);
      for (let i = 0; i < 5; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, b);
      if ((tx + ty * 3) % 7 === 0) R(2, 7, 7, 1, b);
      break;
    case 'stone':
      R(0, 0, 16, 16, a);
      R(0, 7, 16, 1, b); R(0, 15, 16, 1, b); R(ty % 2 ? 4 : 11, 0, 1, 7, b); R(ty % 2 ? 11 : 4, 8, 1, 7, b);
      break;
  }
};

// Mobilya kataloğu: w,h (karo); solid: 'all' | 'base' | 'none'; reach: tezgâh üzerinden konuşma
const FURN = {};
function F(name, w, h, solid, draw, extra) { FURN[name] = Object.assign({ w, h, solid, draw }, extra || {}); }

const wood = '#8a5a32', woodD = '#6b4426', woodL = '#a8743f';
F('desk', 2, 1, 'all', (R) => { R(0, 2, 32, 9, woodL); R(0, 2, 32, 2, '#c08a52'); R(1, 11, 3, 5, woodD); R(28, 11, 3, 5, woodD); R(5, 6, 22, 1, woodD); R(9, 4, 6, 2, '#f4f1ea'); R(18, 3, 4, 3, '#d9d2c0'); });
F('cdesk', 2, 1, 'all', (R) => { R(0, 4, 32, 8, woodL); R(0, 4, 32, 2, '#c08a52'); R(1, 12, 3, 4, woodD); R(28, 12, 3, 4, woodD); R(8, -8, 16, 11, '#2d3138'); R(9, -7, 14, 8, '#5fb3d9'); R(10, -6, 6, 1, '#d6f1ff'); R(10, -4, 9, 1, '#d6f1ff'); R(14, 3, 4, 2, '#2d3138'); R(10, 6, 10, 2, '#ddd'); });
F('chair', 1, 1, 'none', (R) => { R(4, 2, 8, 7, '#4b555e'); R(4, 9, 8, 3, '#5c6670'); R(5, 12, 1, 4, '#333'); R(10, 12, 1, 4, '#333'); });
F('couch', 3, 1, 'all', (R) => { R(0, -4, 48, 8, '#6b3f24'); R(0, 2, 48, 12, '#8a5232'); R(0, 2, 5, 13, '#6b3f24'); R(43, 2, 5, 13, '#6b3f24'); R(6, 4, 17, 7, '#9b6240'); R(25, 4, 17, 7, '#9b6240'); R(8, 5, 6, 1, '#b07a52'); R(27, 5, 6, 1, '#b07a52'); R(2, 14, 3, 2, '#3a2414'); R(43, 14, 3, 2, '#3a2414'); });
F('sofa', 2, 1, 'all', (R, c) => { const col = c || '#5a6e9a'; R(0, -3, 32, 7, ART.shade(col, -0.2)); R(0, 3, 32, 11, col); R(0, 3, 4, 12, ART.shade(col, -0.2)); R(28, 3, 4, 12, ART.shade(col, -0.2)); R(5, 5, 22, 1, ART.shade(col, 0.2)); });
F('armchair', 1, 1, 'all', (R, c) => { const col = c || '#7a2f3a'; R(1, -3, 14, 7, ART.shade(col, -0.2)); R(1, 3, 14, 11, col); R(1, 3, 3, 12, ART.shade(col, -0.2)); R(12, 3, 3, 12, ART.shade(col, -0.2)); });
F('bookshelf', 2, 2, 'base', (R) => { R(0, 0, 32, 32, woodD); R(2, 2, 28, 28, '#4b2e1c'); const cs = ['#a33a2e', '#3a6ad2', '#e8c35a', '#3aa04a', '#7a3a8a', '#ddd']; for (let s = 0; s < 3; s++) { R(2, 10 + s * 9, 28, 2, woodD); for (let i = 0; i < 9; i++) R(3 + i * 3, 3 + s * 9, 2, 7, cs[(i * 7 + s * 3) % 6]); } });
F('plant', 1, 1, 'all', (R) => { R(4, 9, 8, 7, '#b0603a'); R(4, 9, 8, 2, '#c97a4a'); R(7, -2, 2, 11, '#3a7d38'); R(2, 0, 6, 4, '#4f9a45'); R(8, -3, 6, 4, '#4f9a45'); R(3, 4, 5, 3, '#3a7d38'); R(9, 3, 5, 3, '#6bb85a'); });
F('table', 2, 2, 'all', (R, c) => { const col = c || woodL; R(0, 2, 32, 22, col); R(0, 2, 32, 2, ART.shade(col, 0.2)); R(0, 24, 32, 3, ART.shade(col, -0.25)); R(2, 27, 3, 5, woodD); R(27, 27, 3, 5, woodD); R(6, 8, 6, 5, '#f4f1ea'); R(18, 12, 5, 6, '#7a2f3a'); R(19, 13, 3, 2, '#a34a5a'); });
F('ctable', 1, 1, 'all', (R) => { R(1, 2, 14, 8, '#e8dcc8'); R(1, 2, 14, 1, '#fff'); R(7, 10, 2, 5, '#4b555e'); R(4, 15, 8, 1, '#4b555e'); R(4, 4, 4, 3, '#f4f1ea'); R(5, 3, 2, 1, '#8a5a32'); });
F('counter', 4, 1, 'all', (R, c) => { const col = c || woodD; R(0, 0, 64, 16, col); R(0, 0, 64, 4, ART.shade(col, 0.35)); for (let x = 4; x < 64; x += 12) R(x, 6, 1, 9, ART.shade(col, -0.25)); }, { reach: true });
F('counter5', 5, 1, 'all', (R, c) => { const col = c || woodD; R(0, 0, 80, 16, col); R(0, 0, 80, 4, ART.shade(col, 0.35)); for (let x = 4; x < 80; x += 12) R(x, 6, 1, 9, ART.shade(col, -0.25)); }, { reach: true });
F('coffee', 1, 1, 'none', (R) => { R(3, -6, 10, 10, '#4b555e'); R(4, -5, 8, 3, '#c0c6cc'); R(6, 0, 4, 3, '#222'); R(10, -4, 2, 2, '#d23a3a'); });
F('kitchen', 2, 2, 'base', (R) => { R(0, 14, 32, 18, '#d9d2c0'); R(0, 14, 32, 3, '#f4f1ea'); R(2, 20, 12, 10, '#c9c0aa'); R(18, 20, 12, 10, '#c9c0aa'); R(0, 0, 32, 10, '#c9c0aa'); R(2, 2, 12, 6, '#e8e2d0'); R(18, 2, 12, 6, '#e8e2d0'); R(6, 9, 8, 6, '#c0c6cc'); R(14, 10, 2, 2, '#c0c6cc'); R(7, 8, 6, 1, '#333'); R(20, 10, 5, 5, '#f4f1ea'); R(21, 11, 3, 2, '#c08a52'); });
F('board', 3, 2, 'none', (R) => { R(0, 2, 48, 26, woodD); R(2, 4, 44, 22, '#c9a06a'); R(5, 7, 8, 7, '#f4f1ea'); R(18, 6, 9, 9, '#f4f1ea'); R(33, 8, 9, 7, '#f4f1ea'); R(10, 17, 9, 7, '#f4f1ea'); R(28, 17, 8, 7, '#f4f1ea'); R(9, 10, 12, 1, '#d23a3a'); R(24, 13, 12, 1, '#d23a3a'); R(15, 15, 1, 4, '#d23a3a'); R(31, 15, 1, 3, '#d23a3a'); R(20, 8, 4, 4, '#888'); });
F('window', 2, 2, 'none', (R) => { R(2, 4, 28, 20, '#f4f1ea'); R(4, 6, 24, 16, '#9cc6dc'); R(15, 6, 2, 16, '#f4f1ea'); R(4, 13, 24, 2, '#f4f1ea'); R(6, 8, 4, 4, '#d6eef8'); R(0, 24, 32, 2, '#d9d2c0'); });
F('cabinet', 1, 1, 'all', (R) => { R(1, -6, 14, 22, '#7d8a96'); R(1, -6, 14, 2, '#9aa6b2'); R(3, -2, 10, 7, '#6b7682'); R(3, 7, 10, 7, '#6b7682'); R(6, 1, 4, 1, '#c0c6cc'); R(6, 10, 4, 1, '#c0c6cc'); });
F('rug', 3, 2, 'none', (R, c) => { const col = c || '#8a3a3a'; R(0, 2, 48, 28, ART.shade(col, -0.2)); R(2, 4, 44, 24, col); R(6, 8, 36, 16, ART.shade(col, 0.15)); R(10, 12, 28, 8, col); });
F('rug6', 6, 3, 'none', (R, c) => { const col = c || '#5a3a6b'; R(0, 2, 96, 44, ART.shade(col, -0.2)); R(3, 5, 90, 38, col); R(10, 12, 76, 24, ART.shade(col, 0.15)); R(20, 18, 56, 12, col); });
F('slab', 2, 1, 'all', (R) => { R(0, 2, 32, 10, '#c0c6cc'); R(0, 2, 32, 2, '#e3e7ea'); R(3, 12, 3, 4, '#7d8a96'); R(26, 12, 3, 4, '#7d8a96'); R(2, -2, 28, 8, '#eef2f3'); R(4, -3, 7, 6, '#eef2f3'); R(2, 5, 28, 1, '#c9d0d4'); });
F('morgue', 3, 2, 'none', (R) => { R(0, 2, 48, 28, '#9aa6b2'); for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) { R(2 + x * 15, 4 + y * 13, 14, 12, '#c0c6cc'); R(6 + x * 15, 9 + y * 13, 6, 2, '#5c6670'); } });
F('labdesk', 2, 1, 'all', (R) => { R(0, 3, 32, 13, '#eef2f3'); R(0, 3, 32, 2, '#fff'); R(0, 13, 32, 3, '#c0c6cc'); R(5, -6, 4, 10, '#333'); R(4, -7, 7, 3, '#555'); R(3, 2, 9, 2, '#555'); R(17, 0, 3, 5, '#5fb3d9'); R(22, -1, 3, 6, '#a3d95f'); R(26, 1, 3, 4, '#d95f8a'); });
F('crate', 1, 1, 'all', (R) => { R(1, -2, 14, 17, '#b0803e'); R(1, -2, 14, 2, '#c99a52'); R(1, 6, 14, 1, '#8a5a32'); R(1, -2, 1, 17, '#8a5a32'); R(14, -2, 1, 17, '#8a5a32'); R(2, 0, 12, 1, '#8a5a32'); R(3, 1, 10, 13, 'rgba(0,0,0,0)'); R(3, 2, 1, 1, '#8a5a32'); });
F('barrel', 1, 1, 'all', (R) => { R(2, -2, 12, 17, '#8a5a32'); R(2, 0, 12, 2, '#555'); R(2, 10, 12, 2, '#555'); R(3, -2, 10, 2, '#a8743f'); R(4, 2, 2, 8, '#a8743f'); });
F('rack', 3, 2, 'base', (R) => { R(0, 0, 3, 32, '#4b555e'); R(45, 0, 3, 32, '#4b555e'); for (let s = 0; s < 3; s++) { R(0, 8 + s * 10, 48, 2, '#5c6670'); R(4 + s * 6, 1 + s * 10, 12, 7, '#b0803e'); R(24 - s * 3, 1 + s * 10, 10, 7, '#c99a52'); } });
F('forklift', 2, 2, 'all', (R) => { R(4, 6, 22, 18, '#e8b02e'); R(4, 6, 22, 3, '#ffd25a'); R(8, 0, 14, 8, '#333'); R(9, 1, 12, 6, '#9cc6dc'); R(26, 0, 3, 28, '#555'); R(26, 24, 6, 2, '#777'); pcirc2(R, 9, 26, 4); pcirc2(R, 21, 26, 4); });
F('statue', 1, 2, 'base', (R) => { R(2, 20, 12, 12, '#e3e0d8'); R(2, 20, 12, 2, '#fff'); R(5, 2, 6, 6, '#cfcac0'); R(4, 8, 8, 12, '#cfcac0'); R(6, 3, 2, 2, '#b5afa3'); });
F('artwall', 2, 2, 'none', (R, c) => { R(3, 3, 26, 20, '#c9a24a'); R(5, 5, 22, 16, c || '#3a6ad2'); R(8, 8, 8, 6, ART.shade(c || '#3a6ad2', 0.35)); R(16, 13, 9, 6, ART.shade(c || '#3a6ad2', -0.3)); R(0, 26, 32, 2, '#ddd'); });
F('bench', 2, 1, 'all', (R) => { R(1, 4, 30, 7, '#333'); R(1, 4, 30, 2, '#555'); R(3, 11, 2, 5, '#222'); R(27, 11, 2, 5, '#222'); });
F('easel', 1, 1, 'all', (R) => { R(3, -8, 2, 24, woodD); R(11, -8, 2, 24, woodD); R(1, -10, 14, 14, '#f4f1ea'); R(3, -8, 10, 10, '#d95f5f'); R(5, -6, 5, 4, '#e8c35a'); });
F('fireplace', 2, 2, 'none', (R) => { R(0, 2, 32, 30, '#9a8a7a'); R(0, 2, 32, 4, '#b5a594'); R(6, 12, 20, 20, '#2b1d1a'); R(9, 22, 14, 6, '#e86a2e'); R(12, 18, 8, 6, '#ffb03a'); R(14, 16, 3, 4, '#ffe08a'); });
F('piano', 2, 2, 'all', (R) => { R(0, 0, 32, 26, '#1f1b20'); R(2, 2, 28, 4, '#3a3540'); R(0, 18, 32, 6, '#f4f1ea'); for (let x = 2; x < 32; x += 4) R(x, 18, 2, 3, '#1f1b20'); R(2, 26, 3, 6, '#1f1b20'); R(27, 26, 3, 6, '#1f1b20'); });
F('gclock', 1, 2, 'base', (R) => { R(2, 0, 12, 32, woodD); R(4, 3, 8, 8, '#f4f1ea'); R(7, 5, 1, 4, '#222'); R(8, 7, 3, 1, '#222'); R(5, 14, 6, 14, '#4b2e1c'); R(7, 16, 2, 9, '#e8c35a'); });
F('bed', 2, 2, 'all', (R, c) => { const col = c || '#5a7ec9'; R(0, 0, 32, 32, woodD); R(2, 2, 28, 28, '#f4f1ea'); R(4, 3, 10, 6, '#fff'); R(18, 3, 10, 6, '#fff'); R(2, 12, 28, 18, col); R(2, 12, 28, 2, ART.shade(col, 0.25)); });
F('tv', 2, 2, 'base', (R) => { R(0, 18, 32, 14, woodD); R(0, 18, 32, 2, woodL); R(3, 0, 26, 17, '#1f1b20'); R(5, 2, 22, 13, '#2f4a5e'); R(7, 4, 6, 3, '#4a7a9a'); });
F('stool', 1, 1, 'none', (R) => { R(4, 4, 8, 4, '#a33a2e'); R(7, 8, 2, 7, '#555'); R(5, 14, 6, 1, '#555'); });
F('bottles', 5, 2, 'none', (R) => { R(0, 2, 80, 28, '#4b2e1c'); for (let s = 0; s < 2; s++) { R(0, 14 + s * 13, 80, 2, '#6b4426'); for (let i = 0; i < 16; i++) { const col = ['#3aa04a', '#a33a2e', '#e8c35a', '#7a8fa0', '#6b2d6b'][(i * 3 + s) % 5]; R(3 + i * 5, 5 + s * 13, 3, 9, col); R(4 + i * 5, 3 + s * 13, 1, 2, col); } } });
F('jukebox', 1, 2, 'base', (R) => { R(1, 4, 14, 28, '#a33a2e'); R(1, 2, 14, 6, '#e8c35a'); R(3, 9, 10, 8, '#ffb03a'); R(3, 20, 10, 8, '#2b1d1a'); R(4, 21, 8, 1, '#e8c35a'); R(4, 24, 8, 1, '#e8c35a'); });
F('pooltable', 3, 2, 'all', (R) => { R(0, 2, 48, 26, '#5a3a24'); R(3, 5, 42, 20, '#2f7a4a'); R(3, 5, 2, 2, '#111'); R(43, 5, 2, 2, '#111'); R(3, 23, 2, 2, '#111'); R(43, 23, 2, 2, '#111'); R(14, 12, 3, 3, '#fff'); R(30, 14, 3, 3, '#d23a3a'); R(33, 11, 3, 3, '#e8c35a'); R(4, 28, 3, 4, '#3a2414'); R(41, 28, 3, 4, '#3a2414'); });
F('reception', 4, 1, 'all', (R) => { R(0, 0, 64, 16, '#7a2f3a'); R(0, 0, 64, 4, '#c9a24a'); R(4, 6, 56, 1, '#5a1f2a'); R(46, -6, 6, 6, '#e8c35a'); R(48, -8, 2, 2, '#e8c35a'); }, { reach: true });
F('keyboard', 2, 2, 'none', (R) => { R(2, 6, 28, 20, woodD); for (let y = 0; y < 3; y++) for (let x = 0; x < 5; x++) { R(5 + x * 5, 9 + y * 6, 2, 1, '#e8c35a'); R(5 + x * 5, 10 + y * 6, 2, 3, '#c9a24a'); } });
F('elevator', 2, 2, 'none', (R) => { R(2, 2, 28, 30, '#c9a24a'); R(4, 6, 12, 26, '#c0c6cc'); R(16, 6, 12, 26, '#aab2ba'); R(14, 3, 4, 2, '#d23a3a'); });
F('barrelrack', 4, 2, 'base', (R) => { R(0, 18, 64, 14, woodD); for (let i = 0; i < 4; i++) { pcirc2(R, 8 + i * 16, 14, 7, '#8a5a32'); pcirc2(R, 8 + i * 16, 14, 4, '#6b4426'); R(7 + i * 16, 13, 2, 2, '#333'); } });
F('grapes', 1, 1, 'all', (R) => { R(1, 4, 14, 11, '#b0803e'); R(1, 4, 14, 2, '#c99a52'); [[3, 1], [6, 2], [9, 1], [4, 4], [8, 4], [11, 3]].forEach(([x, y]) => R(x, y, 3, 3, '#6b2d6b')); });
F('safe', 1, 1, 'all', (R) => { R(1, -4, 14, 19, '#4b555e'); R(1, -4, 14, 2, '#7d8a96'); R(3, -1, 10, 13, '#5c6670'); pcirc2(R, 8, 5, 3, '#c0c6cc'); R(7, 4, 2, 2, '#333'); R(11, 3, 1, 4, '#c0c6cc'); });
F('lamp', 1, 1, 'all', (R) => { R(7, -4, 2, 18, '#555'); R(4, 14, 8, 2, '#555'); R(3, -10, 10, 7, '#f2d48a'); R(4, -9, 8, 1, '#fff2c0'); });

function pcirc2(R, cx, cy, r, col) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) R(cx + x, cy + y, 1, 1, col || '#222');
}

ART.FURN = FURN;

// İç mekânın statik katmanını çizer (zemin + duvar + mobilya).
ART.renderInterior = function (m, def) {
  const W = m.w * TS, H = m.h * TS;
  const [c, g] = ART.canvas(W, H);
  const r = U.rng(def.id.length * 977 + 13);
  for (let y = 2; y < m.h; y++) for (let x = 0; x < m.w; x++) ART.floor(g, def.floor, def.floorColors, x * TS, y * TS, r, x, y);
  // Üst duvar
  const wall = def.wall, wallD = ART.shade(wall, -0.2);
  g.fillStyle = wall; g.fillRect(0, 0, W, 2 * TS);
  if (def.wallStripe) for (let x = 0; x < W; x += 8) { g.fillStyle = ART.shade(wall, -0.07); g.fillRect(x, 0, 4, 2 * TS); }
  g.fillStyle = wallD; g.fillRect(0, 2 * TS - 4, W, 4);
  g.fillStyle = ART.shade(wall, 0.15); g.fillRect(0, 0, W, 2);
  // Yan ve alt duvar kenarları
  const edge = '#2b1d1a';
  g.fillStyle = edge;
  g.fillRect(0, 0, 6, H); g.fillRect(W - 6, 0, 6, H);
  g.fillRect(0, H - 8, W, 8);
  // Kapı paspası
  const dx = m.door.x * TS;
  g.fillStyle = def.floorColors[0]; g.fillRect(dx, H - 16, 16, 16);
  g.fillStyle = '#7a3a2e'; g.fillRect(dx - 4, H - 12, 24, 10);
  g.fillStyle = '#9a4a3a'; g.fillRect(dx - 2, H - 10, 20, 6);
  // Mobilyalar (y sırasına göre)
  const floorFirst = (f) => (f.t.startsWith('rug') ? 0 : 1);
  const list = def.furniture.slice().sort((a, b) => (floorFirst(a) - floorFirst(b)) || ((a.y + FURN[a.t].h) - (b.y + FURN[b.t].h)));
  for (const f of list) {
    const cat = FURN[f.t];
    const ox = f.x * TS, oy = f.y * TS;
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(ox + x, oy + y, w, h); };
    cat.draw(R, f.c);
  }
  return c;
};

// Olay yeri tebeşir çizgisi
ART.chalk = function () {
  const [c, g] = ART.canvas(32, 22);
  const P = (x, y) => { g.fillStyle = '#f4f1ea'; g.fillRect(x, y, 1, 1); };
  // basit insan silueti (yan yatmış)
  for (let a = 0; a < Math.PI * 2; a += 0.15) P(Math.round(5 + Math.cos(a) * 4), Math.round(8 + Math.sin(a) * 4));
  for (let x = 9; x < 24; x++) { P(x, 5); P(x, 12); }
  for (let x = 24; x < 31; x++) { P(x, 6 + (x - 24) * 0.2); P(x, 11 - (x - 24) * 0.2 + 2); }
  for (let y = 0; y < 5; y++) { P(14 + y, 5 - y); P(16 + y, 12 + y); }
  P(31, 8); P(31, 9); P(31, 10); P(30, 13); P(30, 7);
  return c;
};

ART.tape = function () {
  const [c, g] = ART.canvas(16, 6);
  for (let x = 0; x < 16; x++) { g.fillStyle = (Math.floor(x / 3) % 2) ? '#222' : '#f2d22e'; g.fillRect(x, 1, 1, 4); }
  return c;
};
