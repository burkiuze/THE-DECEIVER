'use strict';
// Tüm grafikler kodla çiziliyor: 16x32 karakterler, karolar, binalar, sokak eşyaları, mobilyalar.

const ART = {};
const TS = 16;

ART.canvas = function (w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
};

ART.shade = function (hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return '#' + [r, g, b].map((v) => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
};
const SH = ART.shade;

// Opak piksellerin çevresine kontur
ART.outline = function (c, color, alpha) {
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  const d = g.getImageData(0, 0, w, h).data;
  const out = g.createImageData(w, h);
  const o = out.data;
  const n = parseInt(color.slice(1), 16);
  const cr = (n >> 16) & 255, cg = (n >> 8) & 255, cb = n & 255;
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 60;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (op(x, y)) continue;
    if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) {
      const i = (y * w + x) * 4;
      o[i] = cr; o[i + 1] = cg; o[i + 2] = cb; o[i + 3] = alpha || 235;
    }
  }
  const [t, tg] = ART.canvas(w, h);
  tg.putImageData(out, 0, 0);
  g.drawImage(t, 0, 0);
};

function pcirc(g, cx, cy, rx, ry, col) {
  g.fillStyle = col;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
    }
  }
}
ART.pcirc = pcirc;

const cache = new Map();
ART.cached = function (key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
};

// =====================================================================================
// KARAKTERLER — 16x32 piksel, 4 yön x 4 kare (0: dur, 1-2: adım, 3: göz kırpma)
// =====================================================================================
function drawChar(g, s, dir, f) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const P = (x, y, c) => R(x, y, 1, 1, c);
  const blink = f === 3;
  if (f === 3) f = 0;
  const skin = s.skin, skinD = SH(skin, -0.16), skinL = SH(skin, 0.14);
  const hair = s.hair, hairD = SH(hair, -0.3), hairL = SH(hair, 0.3);
  const top = s.top;
  const coat = s.labcoat ? '#eef2f3' : (s.jacket || top);
  const coatD = SH(coat, -0.22), coatL = SH(coat, 0.14);
  const bottom = s.bottom || '#3b3f4a', bottomD = SH(bottom, -0.25);
  const shoes = s.shoes || '#2d2a2a', shoesL = SH(shoes, 0.3), shoesD = SH(shoes, -0.35);
  const eye = '#22181a';
  const mouth = s.lips || SH(skin, -0.35);
  const brow = s.hairStyle === 'bald' ? SH(skin, -0.35) : hairD;
  const st = s.hairStyle;
  const lL = f === 1 ? 1 : 0, lR = f === 2 ? 1 : 0;

  if (dir === 0 || dir === 1) {
    // ---------- bacaklar
    if (s.dress) {
      const leg = s.stockings || skinD;
      R(5, 27, 2, 3 - lL, leg); R(9, 27, 2, 3 - lR, leg);
      R(4, 30 - lL, 3, 2, shoes); R(9, 30 - lR, 3, 2, shoes);
      P(4, 30 - lL, shoesL); P(9, 30 - lR, shoesL);
      R(4, 21, 8, 4, bottom); R(3, 24, 10, 3, bottom); R(3, 26, 10, 1, bottomD); R(4, 21, 1, 5, bottomD);
      R(7, 22, 1, 4, SH(bottom, 0.12));
    } else {
      R(4, 24, 4, 6 - lL, bottom); R(8, 24, 4, 6 - lR, bottom);
      R(4, 24, 1, 6 - lL, bottomD); R(8, 25, 1, 5 - lR, bottomD);
      R(3, 30 - lL, 4, 2, shoes); R(9, 30 - lR, 4, 2, shoes);
      P(4, 30 - lL, shoesL); P(10, 30 - lR, shoesL);
      R(3, 31 - lL, 4, 1, shoesD); R(9, 31 - lR, 4, 1, shoesD);
    }
    // ---------- gövde
    R(4, 15, 8, 1, coat); R(3, 16, 10, 8, coat);
    R(3, 16, 1, 8, coatD); R(12, 16, 1, 8, coatD); R(4, 16, 1, 5, coatL);
    if (s.labcoat) { R(3, 24, 3, 4, coat); R(10, 24, 3, 4, coat); R(3, 27, 3, 1, coatD); R(10, 27, 3, 1, coatD); }
    if (dir === 0) {
      if (s.jacket || s.labcoat) {
        const inner = s.vest || top;
        R(6, 15, 4, 8, inner);
        if (s.vest) { R(7, 15, 2, 2, top); P(7, 18, SH(s.vest, -0.35)); P(7, 20, SH(s.vest, -0.35)); R(6, 22, 4, 1, SH(s.vest, -0.2)); }
        R(5, 15, 1, 5, coatD); R(10, 15, 1, 5, coatD);
      } else {
        R(6, 15, 4, 1, SH(top, 0.2)); P(7, 16, SH(top, -0.15)); P(8, 16, SH(top, -0.15));
        if (s.stripes) for (let y = 17; y < 23; y += 2) R(4, y, 8, 1, s.stripes);
      }
      if (s.tie) { R(7, 15, 2, 1, SH(s.tie, -0.3)); R(7, 16, 2, 5, s.tie); P(7, 21, s.tie); P(8, 16, SH(s.tie, 0.25)); }
      if (s.apron) { R(4, 18, 8, 7, s.apron); R(5, 15, 1, 3, s.apron); R(10, 15, 1, 3, s.apron); R(4, 18, 8, 1, SH(s.apron, 0.2)); R(6, 21, 4, 2, SH(s.apron, -0.15)); }
      if (s.badge) { R(10, 18, 2, 2, '#e8c35a'); P(10, 18, '#fff3b0'); }
      if (s.necklace) { R(6, 16, 4, 1, s.necklace); P(8, 17, s.necklace); }
      if (s.uniform) { R(4, 17, 2, 2, SH(coat, 0.2)); R(10, 17, 2, 2, SH(coat, 0.2)); R(10, 18, 2, 2, '#e8c35a'); }
    }
    if (s.scarf) { R(4, 14, 8, 2, s.scarf); R(9, 16, 2, 4, s.scarf); P(9, 19, SH(s.scarf, -0.25)); }
    if (!s.dress && !s.labcoat) { R(3, 23, 10, 1, SH(bottom, -0.4)); if (dir === 0) P(7, 23, '#c9a24a'); }
    // ---------- kollar
    const aL = f === 1 ? 1 : f === 2 ? -1 : 0;
    const aR = -aL;
    R(1, 16 + Math.max(0, aL), 2, 7, coat); R(1, 16 + Math.max(0, aL), 1, 7, coatD); R(1, 23 + aL, 2, 2, skin);
    R(13, 16 + Math.max(0, aR), 2, 7, coatD); R(14, 16 + Math.max(0, aR), 1, 7, SH(coat, -0.32)); R(13, 23 + aR, 2, 2, skinD);
    // ---------- boyun + kafa
    R(6, 14, 4, 1, skinD);
    R(5, 3, 6, 1, skin); R(4, 4, 8, 1, skin); R(3, 5, 10, 7, skin); R(4, 12, 8, 1, skin); R(5, 13, 6, 1, skinD);
    R(2, 8, 1, 2, skin); R(13, 8, 1, 2, skinD);
    R(12, 6, 1, 6, skinD);
    if (dir === 0) {
      if (blink) { R(4, 9, 2, 1, eye); R(10, 9, 2, 1, eye); }
      else {
        R(5, 8, 1, 2, eye); R(10, 8, 1, 2, eye);
        P(5, 8, s.eyeColor || '#3a2a2a'); P(10, 8, s.eyeColor || '#3a2a2a');
        P(4, 8, '#f4efe8'); P(11, 8, '#f4efe8');
      }
      R(4, 7, 2, 1, brow); R(10, 7, 2, 1, brow);
      P(8, 10, skinD);
      R(7, 11, 2, 1, mouth);
      if (s.female) { P(4, 10, '#eaa090'); P(11, 10, '#eaa090'); if (!blink) { P(4, 7, eye); P(11, 7, eye); } }
      if (s.old) { R(6, 5, 4, 1, skinD); P(3, 10, skinD); P(12, 10, skinD); }
      if (s.beard) {
        const b = s.beard, bs = s.beardStyle || 'full';
        if (bs === 'full') { R(3, 9, 1, 3, b); R(12, 9, 1, 3, b); R(4, 11, 8, 2, b); R(5, 13, 6, 1, b); R(6, 10, 4, 1, b); R(7, 11, 2, 1, mouth); }
        else if (bs === 'mustache') R(6, 10, 4, 1, b);
        else if (bs === 'goatee') { R(6, 10, 4, 1, b); R(7, 12, 2, 2, b); }
        else { [[4, 11], [6, 12], [9, 12], [11, 11], [5, 13], [10, 13], [8, 13]].forEach(([x, y]) => P(x, y, SH(b, 0.1))); }
      }
      if (s.glasses === 'sun') { R(4, 8, 3, 2, '#141414'); R(9, 8, 3, 2, '#141414'); R(7, 8, 2, 1, '#141414'); P(4, 8, '#555'); }
      else if (s.glasses) { R(4, 7, 3, 1, '#2a2a2a'); R(9, 7, 3, 1, '#2a2a2a'); R(4, 7, 1, 3, '#2a2a2a'); R(6, 7, 1, 3, '#2a2a2a'); R(9, 7, 1, 3, '#2a2a2a'); R(11, 7, 1, 3, '#2a2a2a'); R(7, 8, 2, 1, '#2a2a2a'); }
      if (s.earrings) { P(2, 10, s.earrings); P(13, 10, s.earrings); }
    }
    // ---------- saç
    if (dir === 0) {
      if (st === 'curly') {
        R(3, 1, 10, 5, hair); R(2, 3, 12, 3, hair); R(4, 0, 8, 1, hair);
        R(2, 6, 2, 3, hair); R(12, 6, 2, 3, hair);
        P(4, 6, hair); P(6, 6, hair); P(9, 6, hair); P(11, 6, hair); P(3, 6, hair); P(12, 6, hair);
        [[4, 1], [7, 0], [10, 1], [5, 3], [9, 2], [12, 3], [3, 4], [7, 4], [11, 5], [2, 6]].forEach(([x, y]) => P(x, y, hairL));
        [[6, 2], [11, 2], [8, 3], [4, 5], [10, 4], [13, 7]].forEach(([x, y]) => P(x, y, hairD));
      } else if (st === 'long' || st === 'braids') {
        R(4, 2, 8, 2, hair); R(3, 3, 10, 3, hair); R(2, 5, 2, 11, hair); R(12, 5, 2, 11, hair);
        R(4, 6, 2, 1, hair); R(10, 6, 2, 1, hair); R(3, 6, 1, 4, hair); R(12, 6, 1, 4, hair);
        R(5, 3, 3, 1, hairL); R(2, 14, 2, 2, hairD); R(12, 14, 2, 2, hairD); P(7, 4, hairD);
        if (st === 'braids') for (let y = 9; y < 16; y += 2) { P(2, y, hairD); P(13, y, hairD); }
      } else if (st === 'bob') {
        R(4, 2, 8, 2, hair); R(3, 3, 10, 4, hair); R(2, 5, 2, 7, hair); R(12, 5, 2, 7, hair);
        R(2, 11, 2, 1, hairD); R(12, 11, 2, 1, hairD); R(5, 3, 3, 1, hairL);
      } else if (st === 'bun') {
        R(4, 2, 8, 2, hair); R(3, 3, 10, 3, hair); R(3, 6, 1, 3, hair); R(12, 6, 1, 3, hair); R(6, 0, 4, 2, hairD); R(7, 0, 2, 1, hair); R(5, 3, 3, 1, hairL);
      } else if (st === 'ponytail') {
        R(4, 2, 8, 2, hair); R(3, 3, 10, 3, hair); R(3, 6, 1, 3, hair); R(12, 6, 1, 3, hair); R(4, 6, 3, 1, hair); R(5, 3, 3, 1, hairL); R(13, 7, 1, 6, hairD);
      } else if (st === 'bald') {
        R(3, 6, 1, 3, hair); R(12, 6, 1, 3, hair); R(4, 5, 1, 1, hair); R(11, 5, 1, 1, hair); R(6, 4, 2, 1, skinL);
      } else if (st === 'afro') {
        pcirc(g, 8, 4.5, 7, 5.5, hair); R(3, 6, 1, 3, hair); R(12, 6, 1, 3, hair);
        [[4, 2], [8, 1], [11, 3], [6, 4], [10, 6]].forEach(([x, y]) => P(x, y, hairL));
      } else if (st === 'spiky') {
        R(3, 3, 10, 3, hair); R(4, 1, 2, 2, hair); R(7, 0, 2, 3, hair); R(10, 1, 2, 2, hair); R(3, 6, 1, 2, hair); R(12, 6, 1, 2, hair); P(8, 1, hairL); P(5, 3, hairL);
      } else if (st === 'slick') {
        R(4, 2, 8, 2, hair); R(3, 3, 10, 2, hair); R(3, 5, 1, 3, hair); R(12, 5, 1, 3, hair); R(8, 5, 4, 1, hair); P(6, 3, hairD); R(4, 3, 2, 1, hairL);
      } else if (st === 'buzz') {
        R(4, 3, 8, 2, SH(hair, 0.15)); R(3, 4, 1, 3, hair); R(12, 4, 1, 3, hair);
      } else { // short
        R(4, 2, 8, 2, hair); R(3, 3, 10, 3, hair); R(3, 6, 1, 2, hair); R(12, 6, 1, 2, hair); R(4, 6, 3, 1, hair); R(9, 6, 2, 1, hair); R(5, 3, 3, 1, hairL); P(10, 4, hairD);
      }
    } else {
      if (st === 'bald') { R(4, 3, 8, 9, skin); R(3, 7, 10, 4, hair); R(6, 4, 2, 1, skinL); }
      else if (st === 'afro') pcirc(g, 8, 6, 7, 6.5, hair);
      else if (st === 'buzz') { R(3, 3, 10, 9, SH(hair, 0.15)); }
      else {
        R(3, 2, 10, 10, hair); R(4, 1, 8, 1, hair); R(2, 4, 1, 7, hair); R(13, 4, 1, 7, hair);
        if (st === 'curly') { R(2, 1, 12, 9, hair); [[4, 2], [7, 3], [10, 2], [5, 6], [9, 7], [12, 4], [6, 9], [3, 7]].forEach(([x, y]) => P(x, y, hairL)); }
        if (st === 'long' || st === 'braids') { R(2, 10, 12, 6, hair); R(3, 15, 10, 1, hairD); }
        if (st === 'bob') R(2, 10, 12, 2, hair);
        if (st === 'bun') { R(6, 0, 4, 3, hairD); }
        if (st === 'ponytail') R(7, 12, 2, 6, hairD);
        R(4, 11, 8, 1, hairD); R(5, 3, 4, 1, hairL);
      }
    }
    if (s.hat) drawHat(R, P, s.hat, dir, false);
  } else {
    // =========== SOL PROFİL (sağ aynalanır)
    if (s.dress) {
      const leg = s.stockings || skinD;
      if (f === 0) { R(6, 27, 3, 3, leg); R(5, 30, 4, 2, shoes); }
      else { R(f === 1 ? 4 : 8, 27, 2, 3, leg); R(f === 1 ? 8 : 5, 27, 2, 3, SH(leg, -0.1)); R(f === 1 ? 3 : 7, 30, 4, 2, shoes); R(f === 1 ? 7 : 4, 30, 4, 2, shoesD); }
      R(4, 21, 8, 4, bottom); R(3, 24, 10, 3, bottom); R(3, 26, 10, 1, bottomD);
    } else if (f === 0) {
      R(6, 24, 4, 6, bottom); R(8, 24, 1, 6, bottomD); R(4, 30, 6, 2, shoes); P(4, 30, shoesL); R(4, 31, 6, 1, shoesD);
    } else {
      const fx = f === 1 ? 3 : 8, bx = f === 1 ? 8 : 4;
      R(bx, 24, 3, 6, bottomD); R(bx - 1, 30, 4, 2, shoesD);
      R(fx, 24, 3, 6, bottom); R(fx - 1, 30, 5, 2, shoes); P(fx - 1, 30, shoesL);
    }
    R(5, 15, 6, 9, coat); R(10, 15, 1, 9, coatD); R(5, 15, 1, 6, coatL);
    if (s.jacket || s.labcoat) { R(5, 15, 1, 5, s.vest || top); }
    if (s.labcoat) R(4, 24, 7, 3, coat);
    if (s.apron) R(4, 18, 2, 7, s.apron);
    if (s.scarf) { R(5, 14, 6, 2, s.scarf); R(4, 16, 2, 4, s.scarf); }
    if (!s.dress && !s.labcoat) R(5, 23, 6, 1, SH(bottom, -0.4));
    const sw = f === 1 ? -2 : f === 2 ? 2 : 0;
    R(7 + sw, 16, 2, 7, coatD); R(7 + sw, 23, 2, 2, skin);
    R(7, 14, 3, 1, skinD);
    R(6, 3, 5, 1, skin); R(5, 4, 7, 1, skin); R(4, 5, 9, 7, skin); R(5, 12, 7, 1, skin); R(6, 13, 5, 1, skinD);
    P(3, 9, skin); P(3, 10, skinD);
    if (blink) R(4, 9, 2, 1, eye); else { R(5, 8, 1, 2, eye); P(4, 8, '#f4efe8'); }
    R(4, 7, 3, 1, brow);
    R(4, 11, 2, 1, mouth);
    if (s.female && !blink) P(5, 7, eye);
    if (s.glasses === 'sun') R(3, 8, 4, 2, '#141414');
    else if (s.glasses) { R(3, 7, 4, 1, '#2a2a2a'); R(3, 9, 4, 1, '#2a2a2a'); R(6, 7, 1, 3, '#2a2a2a'); R(7, 8, 3, 1, '#2a2a2a'); }
    if (s.beard) {
      const b = s.beard, bs = s.beardStyle || 'full';
      if (bs === 'full') { R(4, 10, 6, 3, b); R(5, 13, 5, 1, b); R(4, 11, 2, 1, mouth); }
      else if (bs === 'mustache') R(3, 10, 3, 1, b);
      else if (bs === 'goatee') { R(3, 10, 3, 1, b); R(4, 12, 2, 2, b); }
    }
    if (st === 'bald') { R(9, 6, 4, 4, hair); R(6, 4, 2, 1, skinL); }
    else if (st === 'afro') { pcirc(g, 9, 5, 6.5, 5.5, hair); P(6, 3, hairL); }
    else if (st === 'buzz') { R(5, 3, 7, 2, SH(hair, 0.15)); R(9, 5, 3, 4, SH(hair, 0.15)); }
    else {
      R(5, 2, 7, 3, hair); R(8, 4, 5, 6, hair); R(6, 1, 5, 1, hair); R(4, 4, 3, 2, hair); R(12, 5, 1, 5, hair);
      if (st === 'curly') { R(3, 1, 10, 4, hair); R(2, 3, 3, 3, hair); R(10, 4, 4, 6, hair); [[4, 1], [8, 0], [11, 2], [10, 6], [12, 8], [3, 4]].forEach(([x, y]) => P(x, y, hairL)); }
      if (st === 'long' || st === 'braids') { R(9, 8, 4, 8, hair); R(10, 15, 3, 1, hairD); }
      if (st === 'bob') R(9, 8, 4, 4, hair);
      if (st === 'bun') R(11, 1, 3, 3, hairD);
      if (st === 'ponytail') { R(12, 5, 2, 8, hairD); }
      if (st === 'spiky') { R(6, 0, 2, 2, hair); R(9, 0, 2, 2, hair); }
      R(6, 2, 3, 1, hairL);
    }
    R(9, 8, 1, 2, skinD);
    if (s.earrings) P(9, 10, s.earrings);
    if (s.hat) drawHat(R, P, s.hat, dir, true);
  }
}

function drawHat(R, P, hat, dir, side) {
  const c = hat.color, d = SH(c, -0.3), l = SH(c, 0.2);
  switch (hat.type) {
    case 'fedora':
      if (side) { R(2, 4, 12, 1, d); R(4, 1, 8, 3, c); R(4, 3, 8, 1, SH(c, -0.45)); }
      else { R(1, 4, 14, 1, d); R(4, 1, 8, 3, c); R(4, 3, 8, 1, SH(c, -0.45)); R(5, 1, 3, 1, l); }
      break;
    case 'cap':
      R(3, 1, 10, 4, c); R(5, 1, 3, 1, l);
      if (side) R(1, 4, 5, 1, d); else if (dir === 0) R(3, 5, 10, 1, d);
      break;
    case 'beanie':
      R(3, 1, 10, 5, c); R(3, 5, 10, 1, d); R(7, 0, 2, 1, l); for (let x = 4; x < 12; x += 2) R(x, 2, 1, 3, d);
      break;
    case 'police':
      R(3, 1, 10, 4, c); R(3, 5, 10, 1, '#111'); if (dir === 0) { R(7, 2, 2, 2, '#e8c35a'); } if (side) R(1, 5, 4, 1, '#111');
      break;
    case 'sunhat':
      R(0, 4, 16, 1, d); R(4, 1, 8, 3, c); R(4, 3, 8, 1, '#c94a4a');
      break;
    case 'cowboy':
      R(0, 4, 16, 1, d); R(1, 3, 2, 1, d); R(13, 3, 2, 1, d); R(4, 0, 8, 4, c); R(4, 3, 8, 1, SH(c, -0.45));
      break;
  }
}

const CW = 18, CH = 34;
ART.CW = CW; ART.CH = CH;

ART.charSheet = function (spec) {
  const key = 'ch:' + JSON.stringify(spec);
  return ART.cached(key, () => {
    const [c, g] = ART.canvas(CW * 4, CH * 4);
    for (let dir = 0; dir < 4; dir++) {
      for (let f = 0; f < 4; f++) {
        const [fc, fg] = ART.canvas(CW, CH);
        fg.save();
        fg.translate(1, 1);
        if (dir === 3) { fg.translate(16, 0); fg.scale(-1, 1); }
        drawChar(fg, spec, dir === 3 ? 2 : dir, f);
        fg.restore();
        ART.outline(fc, '#2b1d1a');
        g.drawImage(fc, f * CW, dir * CH);
      }
    }
    return { img: c, cw: CW, ch: CH };
  });
};

// Portre: baş ve omuzlar büyütülmüş
ART.portrait = function (canvas, spec, dead) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  const sheet = ART.charSheet(spec);
  const sh = 22;
  const scale = Math.max(1, Math.floor(canvas.height / sh));
  const sw = CW * scale;
  g.drawImage(sheet.img, dead ? 3 * CW : 0, 0, CW, sh, Math.round((canvas.width - sw) / 2), canvas.height - sh * scale, sw, sh * scale);
  if (dead) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(150,170,190,0.45)'; g.fillRect(0, 0, canvas.width, canvas.height); g.globalCompositeOperation = 'source-over'; }
};

// Yerde yatan ceset (göz kapalı, soluk)
ART.body = function (spec) {
  return ART.cached('body:' + JSON.stringify(spec), () => {
    const sheet = ART.charSheet(spec);
    const [c, g] = ART.canvas(CH, CW);
    g.save();
    g.translate(0, CW);
    g.rotate(-Math.PI / 2);
    g.drawImage(sheet.img, 3 * CW, 0, CW, CH, 0, 0, CW, CH);
    g.restore();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(170,185,205,0.35)'; g.fillRect(0, 0, CH, CW);
    return c;
  });
};

// =====================================================================================
// ZEMİN KAROLARI
// =====================================================================================
ART.groundTile = function (g, type, px, py, r, x, y, nb) {
  const R = (a, b, w, h, col) => {
    const x0 = Math.max(0, a), y0 = Math.max(0, b), x1 = Math.min(16, a + w), y1 = Math.min(16, b + h);
    if (x1 <= x0 || y1 <= y0) return;
    g.fillStyle = col; g.fillRect(px + x0, py + y0, x1 - x0, y1 - y0);
  };
  switch (type) {
    case 'grass': case 'flowers': case 'yard': {
      const base = type === 'yard' ? '#78b84e' : ((x * 7 + y * 13) % 11 < 2 ? '#69a843' : '#6fae46');
      R(0, 0, 16, 16, base);
      for (let i = 0; i < 5; i++) { const a = r.int(0, 14), b = r.int(1, 14); R(a, b, 1, 2, '#5c9a39'); R(a + 1, b - 1, 1, 1, '#5c9a39'); }
      for (let i = 0; i < 3; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, '#8ccb5e');
      if (r.chance(0.08)) { const a = r.int(2, 12), b = r.int(2, 12); R(a, b, 3, 2, '#9a9a8a'); R(a, b, 2, 1, '#b5b5a5'); }
      if (type === 'flowers') {
        const cols = ['#f2e35b', '#f07fa6', '#ffffff', '#9fc2ff', '#ff8a5a'];
        for (let i = 0; i < 5; i++) { const a = r.int(1, 13), b = r.int(1, 13); const c = r.pick(cols); R(a, b, 2, 2, c); R(a, b, 1, 1, SH(c, 0.4)); R(a, b + 2, 1, 1, '#3f7d2d'); }
      }
      break;
    }
    case 'road': {
      R(0, 0, 16, 16, '#53565d');
      for (let i = 0; i < 7; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, r.chance(0.5) ? '#5d6067' : '#484b52');
      if (r.chance(0.05)) R(r.int(2, 10), r.int(2, 12), 4, 1, '#3f4247');
      break;
    }
    case 'sidewalk': {
      R(0, 0, 16, 16, '#c8c2b6');
      R(0, 0, 16, 1, '#b3ada0'); R(0, 0, 1, 16, '#b3ada0'); R(8, 0, 1, 16, '#bdb7aa'); R(0, 8, 16, 1, '#bdb7aa');
      for (let i = 0; i < 3; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, '#d6d0c4');
      if (nb) {
        if (nb.n === 'road') R(0, 0, 16, 2, '#8e8a80');
        if (nb.s === 'road') R(0, 14, 16, 2, '#8e8a80');
        if (nb.w === 'road') R(0, 0, 2, 16, '#8e8a80');
        if (nb.e === 'road') R(14, 0, 2, 16, '#8e8a80');
      }
      break;
    }
    case 'path': {
      R(0, 0, 16, 16, '#c9a96e');
      for (let i = 0; i < 6; i++) R(r.int(0, 15), r.int(0, 15), 2, 1, r.chance(0.5) ? '#b8975c' : '#d8bc84');
      if (r.chance(0.3)) R(r.int(2, 12), r.int(2, 12), 2, 2, '#a89a80');
      break;
    }
    case 'plaza': {
      R(0, 0, 16, 16, '#d8ccb2');
      R(0, 0, 16, 1, '#c2b598'); R(0, 0, 1, 16, '#c2b598'); R(8, 0, 1, 8, '#ccbfa3'); R(0, 8, 16, 1, '#ccbfa3'); R(4, 8, 1, 8, '#ccbfa3'); R(12, 8, 1, 8, '#ccbfa3');
      break;
    }
    case 'sand': {
      R(0, 0, 16, 16, '#e3d09a');
      for (let i = 0; i < 6; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, '#cdb779');
      if (r.chance(0.06)) { R(r.int(2, 12), r.int(2, 12), 2, 1, '#f4ece0'); }
      break;
    }
    case 'water': {
      R(0, 0, 16, 16, '#3a78bf');
      for (let i = 0; i < 3; i++) R(r.int(0, 12), r.int(0, 15), 4, 1, '#5b97d6');
      R(r.int(0, 14), r.int(0, 15), 2, 1, '#2f67a8');
      break;
    }
    case 'deep': R(0, 0, 16, 16, '#2f66a6'); for (let i = 0; i < 2; i++) R(r.int(0, 12), r.int(0, 15), 4, 1, '#4783c4'); break;
    case 'plank': {
      R(0, 0, 16, 16, '#9a6b3e');
      for (let yy = 0; yy < 16; yy += 4) { R(0, yy, 16, 1, '#7a5230'); R(((yy * 5 + x * 3) % 12) + 2, yy + 1, 1, 3, '#86603a'); }
      break;
    }
    case 'soil': {
      R(0, 0, 16, 16, '#8a6a46');
      for (let i = 0; i < 6; i++) R(r.int(0, 15), r.int(0, 15), 2, 1, '#77593a');
      R(0, 7, 16, 1, '#7a5c3c');
      break;
    }
    case 'crosswalk': {
      R(0, 0, 16, 16, '#53565d');
      const vert = nb && nb.vertical;
      for (let i = 1; i < 16; i += 4) { if (vert) R(i, 1, 2, 14, '#e8e6df'); else R(1, i, 14, 2, '#e8e6df'); }
      break;
    }
    case 'parking': {
      R(0, 0, 16, 16, '#5a5d64'); R(0, 0, 1, 16, '#e8e6df'); for (let i = 0; i < 4; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, '#4c4f56');
      break;
    }
  }
};

// =====================================================================================
// DOĞA VE SOKAK EŞYALARI
// =====================================================================================
ART.tree = function (v) {
  return ART.cached('tree' + v, () => {
    const [c, g] = ART.canvas(36, 48);
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    if (v === 2 || v === 5) { // çam
      R(16, 38, 4, 9, '#6b4a2b'); R(16, 38, 1, 9, '#55391f');
      const base = v === 5 ? '#2a5a46' : '#2f6b3a';
      for (let i = 0; i < 4; i++) {
        const top = 3 + i * 8, w = 6 + i * 4;
        for (let rr = 0; rr < 11; rr++) {
          const ww = Math.round(w * (rr + 1) / 11) + 2;
          R(18 - ww, top + rr, ww * 2, 1, rr < 3 ? SH(base, 0.25) : rr > 8 ? SH(base, -0.2) : base);
        }
        R(16, top + 2, 2, 3, SH(base, 0.35));
      }
    } else {
      R(15, 32, 6, 15, '#6b4a2b'); R(15, 32, 2, 15, '#55391f'); R(12, 44, 12, 3, '#55391f'); R(19, 36, 1, 4, '#7d5a36');
      const base = { 0: '#3f8a3e', 1: '#5c9c3c', 3: '#c9762e', 4: '#4f9a5a' }[v] || '#3f8a3e';
      pcirc(g, 18, 20, 16, 14, SH(base, -0.28));
      pcirc(g, 17, 18, 14.5, 12.5, base);
      pcirc(g, 12, 13, 7.5, 6, SH(base, 0.18));
      pcirc(g, 23, 21, 6, 4.5, SH(base, 0.07));
      pcirc(g, 9, 22, 4, 3, SH(base, -0.1));
      for (let i = 0; i < 14; i++) { const a = U.hash(v, i) % 28 + 4, b = U.hash(i, v, 3) % 22 + 6; R(a, b, 1, 1, SH(base, (i % 2) ? 0.3 : -0.25)); }
      if (v === 1) [[10, 22], [21, 11], [25, 22], [15, 26], [8, 15]].forEach(([x, y]) => { R(x, y, 2, 2, '#e05a4f'); R(x, y, 1, 1, '#ff9a8a'); });
      if (v === 4) [[10, 20], [21, 11], [25, 22], [15, 26], [8, 15], [18, 18]].forEach(([x, y]) => { R(x, y, 2, 2, '#f7c3d8'); R(x, y, 1, 1, '#fff'); });
    }
    ART.outline(c, '#24331f');
    return c;
  });
};

ART.prop = function (kind, variant) {
  return ART.cached('prop:' + kind + ':' + (variant || ''), () => makeProp(kind, variant));
};

function makeProp(kind, v) {
  let c, g;
  const mk = (w, h) => { [c, g] = ART.canvas(w, h); };
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  switch (kind) {
    case 'bush': {
      mk(20, 18);
      const base = v === 1 ? '#3d8a52' : '#3b7d38';
      pcirc(g, 10, 10, 9, 7.5, SH(base, -0.2)); pcirc(g, 9, 9, 7.5, 6, base); pcirc(g, 7, 7, 3, 2.5, SH(base, 0.25));
      if (v === 2) [[5, 9], [12, 6], [14, 11], [8, 12]].forEach(([x, y]) => R(x, y, 2, 2, '#f07fa6'));
      ART.outline(c, '#24331f');
      return c;
    }
    case 'hedge': {
      mk(16, 18);
      R(0, 3, 16, 14, '#3b7d38'); R(0, 3, 16, 3, '#4f9a45'); for (let i = 0; i < 8; i++) R((i * 5) % 15, 6 + (i * 3) % 9, 2, 1, '#2f6a2c');
      return c;
    }
    case 'lamp': {
      mk(12, 38);
      R(5, 10, 2, 26, '#2d3138'); R(3, 34, 6, 3, '#2d3138'); R(4, 33, 4, 1, '#3d424a');
      R(2, 3, 8, 7, '#2d3138'); R(3, 4, 6, 5, '#ffe9a8'); R(1, 2, 10, 1, '#2d3138'); R(4, 1, 4, 1, '#2d3138'); R(4, 5, 2, 2, '#fff8d8');
      return c;
    }
    case 'bench': {
      mk(32, 20);
      R(2, 2, 28, 3, '#8a5a32'); R(2, 6, 28, 3, '#8a5a32'); R(2, 11, 28, 3, '#9b6a3e'); R(2, 11, 28, 1, '#b07e4e');
      R(3, 14, 2, 5, '#3a3a3a'); R(27, 14, 2, 5, '#3a3a3a'); R(3, 2, 2, 12, '#3a3a3a'); R(27, 2, 2, 12, '#3a3a3a');
      ART.outline(c, '#3a2414'); return c;
    }
    case 'mailbox': {
      mk(10, 20);
      R(4, 8, 2, 11, '#6b4a2b'); R(1, 2, 8, 7, v || '#3a6ad2'); R(1, 2, 8, 2, SH(v || '#3a6ad2', 0.25)); R(8, 3, 2, 3, '#d23a3a');
      ART.outline(c, '#2b1d1a'); return c;
    }
    case 'hydrant': {
      mk(10, 14);
      R(2, 3, 6, 10, '#c9302c'); R(1, 6, 8, 2, '#a32420'); R(3, 1, 4, 2, '#c9302c'); R(3, 4, 2, 6, '#e5544f'); R(1, 12, 8, 2, '#7a1a17');
      ART.outline(c, '#2b1d1a'); return c;
    }
    case 'trash': {
      mk(12, 16);
      R(1, 3, 10, 12, '#4f6b55'); R(0, 2, 12, 2, '#3f5745'); R(3, 5, 1, 9, '#5f7d65'); R(7, 5, 1, 9, '#5f7d65'); R(4, 0, 4, 2, '#3f5745');
      ART.outline(c, '#1f2a22'); return c;
    }
    case 'phonebooth': {
      mk(18, 36);
      R(1, 2, 16, 33, '#b52a2a'); R(1, 2, 16, 4, '#d23a3a'); R(3, 8, 12, 22, '#9cc6dc'); R(3, 8, 12, 1, '#fff');
      for (let y = 12; y < 30; y += 5) R(3, y, 12, 1, '#b52a2a');
      R(8, 8, 1, 22, '#b52a2a'); R(4, 3, 10, 2, '#fff'); R(6, 31, 6, 3, '#8a1f1f');
      ART.outline(c, '#2b1d1a'); return c;
    }
    case 'busstop': {
      mk(34, 34);
      R(2, 6, 2, 26, '#555'); R(30, 6, 2, 26, '#555'); R(0, 2, 34, 5, '#2f6b9a'); R(0, 2, 34, 1, '#4f8bba');
      R(5, 8, 24, 14, 'rgba(156,198,220,0.6)'); R(6, 22, 22, 3, '#8a5a32'); R(7, 25, 2, 6, '#555'); R(25, 25, 2, 6, '#555'); R(14, 9, 6, 6, '#e8c35a');
      ART.outline(c, '#1f2a33'); return c;
    }
    case 'newsbox': {
      mk(12, 18);
      R(1, 2, 10, 13, '#2f6b9a'); R(2, 4, 8, 5, '#f4f1ea'); R(3, 5, 6, 1, '#333'); R(3, 7, 4, 1, '#333'); R(2, 15, 2, 3, '#333'); R(8, 15, 2, 3, '#333');
      ART.outline(c, '#1f2a33'); return c;
    }
    case 'car': {
      mk(36, 24);
      const body = v || '#9fb4c4', dark = SH(body, -0.25);
      R(3, 10, 30, 8, body); R(2, 12, 32, 5, body); R(9, 3, 17, 8, body); R(9, 3, 17, 1, SH(body, 0.3));
      R(11, 4, 6, 6, '#3d5566'); R(18, 4, 6, 6, '#3d5566'); R(12, 5, 2, 2, '#7fa3b8'); R(19, 5, 2, 2, '#7fa3b8');
      R(2, 16, 32, 2, dark); R(3, 13, 30, 1, SH(body, 0.35)); R(32, 12, 2, 2, '#ffe9a8'); R(2, 12, 2, 2, '#c94a4a');
      R(17, 11, 1, 6, dark);
      pcirc(g, 9, 18.5, 3.5, 3.5, '#1d1d1d'); pcirc(g, 27, 18.5, 3.5, 3.5, '#1d1d1d'); R(8, 17, 2, 2, '#999'); R(26, 17, 2, 2, '#999');
      ART.outline(c, '#1f2a33'); return c;
    }
    case 'jadecar': {
      mk(40, 24);
      const body = '#a9bccb', dark = '#7d92a3';
      R(2, 12, 36, 6, body); R(4, 10, 32, 3, body); R(10, 4, 18, 7, body); R(8, 7, 4, 4, body); R(26, 7, 6, 4, body);
      R(12, 5, 6, 5, '#34495a'); R(19, 5, 7, 5, '#34495a'); R(13, 6, 2, 2, '#7fa3b8');
      R(2, 16, 36, 2, dark); R(4, 13, 32, 1, '#e8eef2'); R(36, 13, 2, 2, '#ffe9a8'); R(2, 13, 2, 2, '#c94a4a');
      R(6, 17, 8, 3, dark); R(26, 17, 8, 3, dark);
      pcirc(g, 10, 19, 3, 3, '#1d1d1d'); pcirc(g, 30, 19, 3, 3, '#1d1d1d');
      ART.outline(c, '#1f2a33'); return c;
    }
    case 'fountain': {
      mk(48, 40);
      pcirc(g, 24, 26, 22, 12, '#9a9a90'); pcirc(g, 24, 25, 20, 10, '#3f7fc4'); pcirc(g, 24, 24, 15, 7, '#5b97d6');
      R(21, 8, 6, 18, '#b5b5aa'); R(21, 8, 2, 18, '#cfcfc4'); pcirc(g, 24, 9, 7, 3, '#9a9a90'); pcirc(g, 24, 8.5, 5, 2, '#5b97d6');
      ART.outline(c, '#4a4a44'); return c;
    }
    case 'gazebo': {
      mk(56, 56);
      R(6, 26, 44, 24, '#e8dcc8'); R(4, 48, 48, 4, '#c9b48a');
      for (const x of [8, 22, 34, 46]) R(x, 24, 3, 26, '#f4f1ea');
      for (let i = 0; i < 14; i++) R(12 - i * 0.5, 4 + i * 1.6, 32 + i, 2, i % 3 ? '#a33a2e' : '#8a2f26');
      R(26, 0, 4, 6, '#8a2f26');
      ART.outline(c, '#3a2414'); return c;
    }
    case 'statue': {
      mk(22, 40);
      R(3, 28, 16, 11, '#b5afa3'); R(3, 28, 16, 2, '#cfc9bd'); R(8, 6, 6, 6, '#8f9a8a'); R(7, 12, 8, 14, '#8f9a8a'); R(4, 12, 3, 9, '#8f9a8a'); R(15, 8, 3, 7, '#8f9a8a');
      R(9, 7, 2, 2, '#a8b4a2'); R(5, 32, 12, 1, '#9a948a');
      ART.outline(c, '#3a3a34'); return c;
    }
    case 'grave': {
      mk(14, 18);
      const col = v === 1 ? '#8f9097' : '#a3a39b';
      R(2, 4, 10, 12, col); R(3, 2, 8, 2, col); R(4, 1, 6, 1, col); R(3, 3, 2, 10, SH(col, 0.2)); R(5, 6, 4, 1, SH(col, -0.3)); R(6, 5, 2, 4, SH(col, -0.3)); R(1, 15, 12, 2, '#5f7d4a');
      ART.outline(c, '#2b2b2b'); return c;
    }
    case 'cross': {
      mk(12, 20);
      R(5, 2, 2, 16, '#8a8a82'); R(2, 6, 8, 2, '#8a8a82'); R(5, 2, 1, 16, '#a6a69c');
      ART.outline(c, '#2b2b2b'); return c;
    }
    case 'crypt': {
      mk(48, 52);
      R(4, 16, 40, 34, '#8f9097'); R(4, 16, 40, 3, '#a9aab0'); R(0, 10, 48, 8, '#6f7077'); R(6, 4, 36, 7, '#7f8087'); R(18, 0, 12, 5, '#7f8087');
      R(17, 28, 14, 22, '#2b2b30'); R(18, 29, 12, 20, '#3a3a40'); R(23, 30, 2, 18, '#2b2b30'); R(8, 22, 6, 10, '#6f7077'); R(34, 22, 6, 10, '#6f7077');
      R(21, 20, 6, 3, '#c9a24a');
      ART.outline(c, '#2b2b2b'); return c;
    }
    case 'boat': {
      mk(48, 28);
      R(2, 14, 44, 8, v || '#f4f1ea'); R(6, 22, 36, 3, SH(v || '#f4f1ea', -0.25)); R(2, 14, 44, 2, '#c94a4a'); R(14, 6, 18, 9, '#e8dcc8'); R(16, 8, 5, 4, '#3d5566'); R(24, 8, 5, 4, '#3d5566'); R(22, 0, 2, 7, '#555');
      ART.outline(c, '#1f2a33'); return c;
    }
    case 'post': { mk(8, 18); R(2, 2, 4, 15, '#6b4a2b'); R(2, 2, 4, 2, '#8a6a46'); R(1, 6, 6, 1, '#c9b48a'); ART.outline(c, '#2b1d1a'); return c; }
    case 'crates': {
      mk(20, 20);
      R(1, 6, 14, 13, '#b0803e'); R(1, 6, 14, 2, '#c99a52'); R(1, 12, 14, 1, '#8a5a32'); R(7, 1, 12, 12, '#a0703a'); R(7, 1, 12, 2, '#b98a4a'); R(7, 7, 12, 1, '#7a5230');
      ART.outline(c, '#3a2414'); return c;
    }
    case 'barrel': {
      mk(14, 18); R(2, 2, 10, 15, '#8a5a32'); R(2, 4, 10, 2, '#555'); R(2, 12, 10, 2, '#555'); R(3, 2, 8, 2, '#a8743f'); R(4, 6, 2, 6, '#a8743f');
      ART.outline(c, '#3a2414'); return c;
    }
    case 'vine': {
      mk(16, 28);
      R(7, 4, 2, 23, '#7a5a3a'); R(1, 8, 14, 1, '#7a5a3a');
      pcirc(g, 8, 12, 7, 7, '#4c8c3c'); pcirc(g, 6, 10, 3, 3, '#64a64e');
      [[4, 14], [9, 16], [11, 11], [6, 18]].forEach(([x, y]) => { R(x, y, 3, 3, '#6b2d6b'); R(x, y, 1, 1, '#a35ca3'); });
      ART.outline(c, '#24331f'); return c;
    }
    case 'fence': {
      mk(16, 14); R(0, 5, 16, 2, '#f4f1ea'); R(0, 10, 16, 2, '#f4f1ea'); for (const x of [1, 6, 11]) { R(x, 1, 3, 13, '#f4f1ea'); R(x, 1, 1, 13, '#d9d2c0'); R(x + 1, 0, 1, 1, '#f4f1ea'); }
      ART.outline(c, '#7a7466', 180); return c;
    }
    case 'fencev': { mk(8, 18); R(3, 0, 2, 18, '#f4f1ea'); R(2, 2, 4, 3, '#f4f1ea'); R(2, 10, 4, 3, '#f4f1ea'); ART.outline(c, '#7a7466', 180); return c; }
    case 'ironfence': { mk(16, 18); R(0, 4, 16, 1, '#2b2b30'); R(0, 14, 16, 1, '#2b2b30'); for (let x = 1; x < 16; x += 3) { R(x, 1, 1, 16, '#2b2b30'); R(x, 0, 1, 1, '#555'); } return c; }
    case 'flowerbed': {
      mk(16, 16);
      R(1, 6, 14, 9, '#7a5a3a'); R(1, 6, 14, 2, '#8a6a46');
      const cols = v === 1 ? ['#f07fa6', '#ffffff'] : ['#f2e35b', '#ff8a5a'];
      for (let i = 0; i < 6; i++) { const x = 2 + (i * 5) % 11, y = 3 + (i * 3) % 6; R(x, y + 2, 1, 3, '#3f7d2d'); R(x - 1, y, 3, 2, cols[i % 2]); }
      ART.outline(c, '#3a2414', 160); return c;
    }
    case 'rock': { mk(16, 12); pcirc(g, 8, 7, 7, 4.5, '#8a8a82'); pcirc(g, 7, 6, 5, 3, '#a3a39b'); ART.outline(c, '#3a3a34'); return c; }
    case 'stump': { mk(14, 12); R(2, 3, 10, 8, '#7a5a3a'); pcirc(g, 7, 3, 5, 2, '#b08a5a'); pcirc(g, 7, 3, 2.5, 1, '#8a6a46'); ART.outline(c, '#3a2414'); return c; }
    case 'lighthouse': {
      mk(40, 92);
      R(12, 22, 16, 66, '#f4f1ea'); for (let y = 30; y < 86; y += 14) R(12, y, 16, 6, '#c9302c');
      R(10, 86, 20, 6, '#8a8a82'); R(10, 12, 20, 10, '#2d3138'); R(13, 14, 14, 7, '#ffe9a8'); R(9, 10, 22, 3, '#2d3138'); R(15, 4, 10, 7, '#c9302c'); R(19, 0, 2, 5, '#2d3138');
      R(16, 74, 8, 12, '#3a2414'); R(12, 22, 3, 66, '#e0dcd2');
      ART.outline(c, '#2b2b30'); return c;
    }
    case 'sign': {
      mk(20, 22); R(9, 10, 2, 11, '#6b4a2b'); R(1, 2, 18, 9, '#8a5a32'); R(2, 3, 16, 7, '#c99a52'); R(4, 5, 12, 1, '#6b4a2b'); R(4, 7, 8, 1, '#6b4a2b');
      ART.outline(c, '#2b1d1a'); return c;
    }
    case 'pool': {
      mk(48, 32); R(0, 0, 48, 32, '#e8e6df'); R(3, 3, 42, 26, '#4fb0d9'); for (let i = 0; i < 5; i++) R(6 + i * 8, 8 + (i % 2) * 10, 6, 1, '#9fdcf2');
      return c;
    }
    case 'shed': {
      mk(34, 34);
      R(2, 12, 30, 20, '#8a5a32'); for (let x = 2; x < 32; x += 4) R(x, 12, 1, 20, '#6b4426');
      R(0, 4, 34, 10, '#5a3a24'); R(0, 4, 34, 2, '#7a5230'); R(12, 18, 10, 14, '#5a3a24'); R(20, 24, 1, 2, '#c9a24a');
      ART.outline(c, '#2b1d1a'); return c;
    }
    case 'bird': { mk(6, 4); R(0, 0, 2, 1, '#2b2b30'); R(2, 1, 2, 1, '#2b2b30'); R(4, 0, 2, 1, '#2b2b30'); return c; }
    case 'tape': { mk(16, 6); for (let x = 0; x < 16; x++) { g.fillStyle = (Math.floor(x / 3) % 2) ? '#222' : '#f2d22e'; g.fillRect(x, 1, 1, 4); } return c; }
    case 'cone': { mk(10, 14); R(3, 1, 4, 11, '#f07a2a'); R(2, 6, 6, 2, '#fff'); R(1, 12, 8, 2, '#c95a1a'); ART.outline(c, '#3a2414'); return c; }
    case 'marker': { mk(10, 10); R(1, 2, 8, 7, '#f2d22e'); R(2, 1, 6, 1, '#f2d22e'); R(1, 8, 8, 1, '#c9a81a'); return c; }
    case 'blood': {
      mk(30, 20);
      pcirc(g, 14, 10, 12, 7, 'rgba(120,10,15,0.75)'); pcirc(g, 22, 13, 5, 3, 'rgba(120,10,15,0.75)'); pcirc(g, 12, 9, 7, 4, 'rgba(150,20,25,0.8)');
      return c;
    }
    case 'chimneysmoke': { mk(8, 8); pcirc(g, 4, 4, 3.5, 3.5, 'rgba(230,230,230,0.6)'); return c; }
  }
  mk(4, 4);
  return c;
}

// =====================================================================================
// BİNALAR
// =====================================================================================
const HOUSE_PAL = [
  { roof: '#3f5f8a', wall: '#a9c7e3', trim: '#f4f1ea', door: '#7a4a2a' },
  { roof: '#a3762e', wall: '#f2dd8a', trim: '#f4f1ea', door: '#5a8a4a' },
  { roof: '#7a2f3a', wall: '#efd9c4', trim: '#f4f1ea', door: '#3a5a8a' },
  { roof: '#4a6b3a', wall: '#d9e6c8', trim: '#f4f1ea', door: '#8a3a3a' },
  { roof: '#5a4a6b', wall: '#e3d4ea', trim: '#f4f1ea', door: '#5a3a24' },
  { roof: '#8a4b2e', wall: '#e8c9a8', trim: '#fff6e8', door: '#2f4a6b', mat: 'brick' },
  { roof: '#4b555e', wall: '#f4f1ea', trim: '#c9c3b8', door: '#c94a4a' },
  { roof: '#6b3a24', wall: '#c9a882', trim: '#f4f1ea', door: '#3a6b5a', mat: 'wood' },
];
ART.HOUSE_PAL = HOUSE_PAL;

const BSTYLE = {
  station: { roof: '#3e4a5e', wall: '#b9c3cf', trim: '#2c3442', door: '#2c3a55', icon: 'badge', mat: 'brick', flag: true, flat: true },
  lab: { roof: '#3f8a86', wall: '#e9edee', trim: '#9aa8ab', door: '#5d7f8a', icon: 'cross', mat: 'stucco', flat: true },
  cafe: { roof: '#9b4a2e', wall: '#efd9b0', trim: '#7a4a2a', door: '#7a4a2a', icon: 'cup', awning: ['#d24a3a', '#f3efe6'], mat: 'brick' },
  hotel: { roof: '#7a2f3a', wall: '#e7c9a3', trim: '#8a6a3a', door: '#6b2a2a', icon: 'bed', rows: 3, mat: 'stucco', awning: ['#7a2f3a', '#e8c35a'] },
  bar: { roof: '#a33a2e', wall: '#8a5a3a', trim: '#4b2e1c', door: '#3b2214', icon: 'boat', mat: 'wood' },
  restaurant: { roof: '#2f5a4a', wall: '#f2e6cf', trim: '#2f5a4a', door: '#2f5a4a', icon: 'fork', mat: 'brick', awning: ['#2f5a4a', '#f3efe6'] },
  gallery: { roof: '#e8e8e8', wall: '#f7f7f4', trim: '#333', door: '#333', icon: 'palette', glass: true, flat: true },
  mansion: { roof: '#4b3a5e', wall: '#efe7d6', trim: '#8a7a5a', door: '#5a3a24', icon: 'crown', columns: true, mat: 'stone', chimney: true, rows: 2 },
  vineyard: { roof: '#8a4b2e', wall: '#d9b98a', trim: '#6b4a2b', door: '#5a3a24', icon: 'grape', mat: 'stone', chimney: true },
  warehouse: { roof: '#6b7680', wall: '#8f9aa3', trim: '#4b555e', door: '#5c6670', icon: 'anchor', mat: 'metal', bigdoor: true, flat: true },
  fbi: { roof: '#2b2f38', wall: '#c9ccd2', trim: '#1f2a44', door: '#1f2a44', icon: 'eagle', mat: 'stone', columns: true, flag: true, flat: true, rows: 2 },
  cityhall: { roof: '#4a6b8a', wall: '#ece4d2', trim: '#8a7a5a', door: '#5a3a24', icon: 'scale', mat: 'stone', columns: true, clock: true, rows: 2 },
  bank: { roof: '#2f3a4a', wall: '#dcd6c6', trim: '#8a7a5a', door: '#2f3a4a', icon: 'coin', mat: 'stone', columns: true, flat: true },
  library: { roof: '#6b3a24', wall: '#c9a882', trim: '#4b2e1c', door: '#4b2e1c', icon: 'book', mat: 'brick' },
  church: { roof: '#5a5a66', wall: '#e6e0d2', trim: '#6b6b74', door: '#6b3a24', icon: 'crossb', mat: 'stone', steeple: true },
  shop: { roof: '#3a6b4a', wall: '#f2e2b0', trim: '#3a6b4a', door: '#3a6b4a', icon: 'bag', mat: 'wood', awning: ['#3a6b4a', '#f3efe6'] },
  market: { roof: '#2f6b9a', wall: '#d9e6ea', trim: '#2f4a6b', door: '#2f4a6b', icon: 'fish', mat: 'wood', awning: ['#2f6b9a', '#f3efe6'] },
  school: { roof: '#9a3a2e', wall: '#d9b07a', trim: '#6b3a24', door: '#6b3a24', icon: 'abc', mat: 'brick', bell: true },
  newspaper: { roof: '#333333', wall: '#d6d2c6', trim: '#222222', door: '#222222', icon: 'news', mat: 'brick', flat: true },
};
ART.BSTYLE = BSTYLE;

function drawIcon(R, icon, x, y) {
  const P = (a, b, w, h, col) => R(x + a, y + b, w, h, col);
  switch (icon) {
    case 'badge': P(2, 1, 6, 6, '#e8c35a'); P(3, 7, 4, 1, '#e8c35a'); P(4, 3, 2, 2, '#8a6a2a'); break;
    case 'cross': P(4, 1, 2, 7, '#d23a3a'); P(1, 3, 8, 2, '#d23a3a'); break;
    case 'cup': P(2, 3, 5, 4, '#fff'); P(7, 4, 1, 2, '#fff'); P(3, 1, 1, 1, '#ccc'); P(5, 0, 1, 2, '#ccc'); break;
    case 'bed': P(1, 4, 8, 3, '#fff'); P(1, 3, 2, 2, '#9fc2ff'); P(1, 7, 1, 1, '#fff'); P(8, 7, 1, 1, '#fff'); break;
    case 'boat': P(1, 5, 8, 2, '#d23a3a'); P(2, 7, 6, 1, '#d23a3a'); P(5, 1, 1, 4, '#fff'); P(6, 2, 2, 2, '#fff'); break;
    case 'palette': P(1, 2, 8, 5, '#e8d2a8'); P(2, 3, 1, 1, '#d23a3a'); P(4, 3, 1, 1, '#3a6ad2'); P(6, 3, 1, 1, '#e8c35a'); P(3, 5, 1, 1, '#3aa04a'); break;
    case 'crown': P(1, 3, 8, 4, '#e8c35a'); P(1, 1, 1, 2, '#e8c35a'); P(4, 1, 2, 2, '#e8c35a'); P(8, 1, 1, 2, '#e8c35a'); break;
    case 'grape': [[3, 2], [5, 2], [2, 4], [4, 4], [6, 4], [3, 6], [5, 6]].forEach(([a, b]) => P(a, b, 2, 2, '#9a5aaa')); P(5, 0, 1, 2, '#3a9a3a'); break;
    case 'anchor': P(4, 1, 2, 6, '#ddd'); P(2, 2, 6, 1, '#ddd'); P(1, 6, 8, 1, '#ddd'); P(1, 5, 1, 1, '#ddd'); P(8, 5, 1, 1, '#ddd'); break;
    case 'eagle': P(1, 3, 8, 2, '#e8c35a'); P(4, 1, 2, 6, '#e8c35a'); P(3, 7, 4, 1, '#e8c35a'); break;
    case 'scale': P(4, 0, 2, 8, '#e8c35a'); P(1, 2, 8, 1, '#e8c35a'); P(0, 5, 3, 1, '#e8c35a'); P(7, 5, 3, 1, '#e8c35a'); break;
    case 'coin': P(2, 1, 6, 6, '#e8c35a'); P(4, 2, 2, 4, '#a8831a'); break;
    case 'book': P(1, 2, 8, 6, '#c94a4a'); P(2, 3, 6, 1, '#fff'); P(4, 2, 1, 6, '#8a2a2a'); break;
    case 'crossb': P(4, 0, 2, 8, '#e8c35a'); P(2, 2, 6, 2, '#e8c35a'); break;
    case 'bag': P(2, 3, 6, 5, '#e8c35a'); P(3, 1, 1, 2, '#e8c35a'); P(6, 1, 1, 2, '#e8c35a'); break;
    case 'fish': P(1, 3, 6, 3, '#9fc2ff'); P(7, 2, 2, 5, '#9fc2ff'); P(2, 4, 1, 1, '#222'); break;
    case 'abc': P(1, 2, 2, 5, '#fff'); P(4, 2, 2, 5, '#fff'); P(7, 2, 2, 5, '#fff'); break;
    case 'news': P(1, 1, 8, 7, '#f4f1ea'); P(2, 2, 6, 2, '#333'); P(2, 5, 6, 1, '#888'); P(2, 6, 4, 1, '#888'); break;
    case 'fork': P(2, 1, 1, 7, '#fff'); P(1, 1, 1, 3, '#fff'); P(3, 1, 1, 3, '#fff'); P(6, 1, 2, 7, '#fff'); break;
  }
}

// Bina görseli. Görsel (pad, 20) kadar kaydırılmış çizilir: dünya konumu = (b.x*16 - pad, b.y*16 - 20)
ART.building = function (b) {
  const st = b.house ? Object.assign({ mat: 'siding', porch: true, shutters: true }, b.pal) : Object.assign({}, BSTYLE[b.style]);
  const W = b.w * TS, H = b.h * TS;
  const pad = 8;
  const [c, g] = ART.canvas(W + pad * 2, H + 22);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x + pad, y + 20, w, h); };
  const roofH = Math.round(H * (st.rows >= 2 ? 0.33 : 0.42));
  const wallY = roofH, wallH = H - roofH;
  const wall = st.wall, wallD = SH(wall, -0.18);
  R(0, wallY, W, wallH, wall);
  if (st.mat === 'brick') for (let y = wallY + 3; y < H - 3; y += 4) { R(0, y, W, 1, SH(wall, -0.1)); for (let x = (y % 8 ? 0 : 4); x < W; x += 8) R(x, y - 3, 1, 3, SH(wall, -0.1)); }
  if (st.mat === 'stone') for (let y = wallY + 4; y < H - 3; y += 6) { R(0, y, W, 1, SH(wall, -0.08)); for (let x = (y % 12 ? 2 : 8); x < W; x += 12) R(x, y - 5, 1, 5, SH(wall, -0.08)); }
  if (st.mat === 'siding') for (let y = wallY + 3; y < H - 3; y += 3) R(0, y, W, 1, SH(wall, -0.07));
  if (st.mat === 'wood') for (let x = 0; x < W; x += 5) R(x, wallY, 1, wallH, SH(wall, -0.18));
  if (st.mat === 'metal') for (let x = 0; x < W; x += 3) R(x, wallY, 1, wallH, SH(wall, x % 6 ? -0.12 : 0.12));
  R(0, wallY, W, 3, SH(wall, -0.28));
  R(0, H - 3, W, 3, SH(wall, -0.32));
  R(0, wallY, 2, wallH, wallD); R(W - 2, wallY, 2, wallH, wallD);
  const doorX = Math.floor(b.w / 2) * TS;
  b.windows = [];
  const rows = st.rows || 1;
  const rowH = Math.floor((wallH - 8) / rows);
  for (let r0 = 0; r0 < rows; r0++) {
    const wy = wallY + 6 + r0 * rowH;
    const last = r0 === rows - 1;
    for (let tx = 0; tx < b.w; tx++) {
      const x = tx * TS;
      if (b.house) {
        if ((tx !== 1 && tx !== b.w - 2) || tx === Math.floor(b.w / 2)) continue;
      } else {
        if (last && Math.abs(x - doorX) < TS * 1.1) continue;
        if (st.columns && last && Math.abs(x - doorX) < TS * 2.2) continue;
        if ((tx === 0 || tx === b.w - 1) && !st.glass) continue;
        if (!st.glass && b.w > 6 && tx % 2 === 1) continue;
      }
      const wh = Math.min(13, rowH - 4);
      if (st.glass) {
        R(x + 1, wy, 14, wallH - 12, '#2f3a44'); R(x + 2, wy + 1, 12, wallH - 14, '#9cc6dc'); R(x + 3, wy + 2, 3, 4, '#d6eef8');
      } else {
        R(x + 2, wy, 12, wh, st.trim); R(x + 3, wy + 1, 10, wh - 2, '#8fb8d0'); R(x + 3, wy + 1, 10, 2, '#b8d8e8'); R(x + 3, wy + Math.floor(wh / 2), 10, 1, st.trim); R(x + 7, wy + 1, 1, wh - 2, st.trim);
        R(x + 4, wy + 2, 2, 2, '#e6f4fa');
        if (b.house) { R(x + 3, wy + 1, 2, wh - 2, SH(st.door, 0.35)); R(x + 11, wy + 1, 2, wh - 2, SH(st.door, 0.35)); }
        R(x + 1, wy + wh, 14, 2, SH(st.trim, -0.15));
        if (st.shutters) { R(x - 1, wy, 3, wh, SH(st.door, -0.05)); R(x + 14, wy, 3, wh, SH(st.door, -0.05)); }
        if (b.flowerbox && last) { R(x + 2, wy + wh + 1, 12, 3, '#8a5a32'); [3, 6, 9, 12].forEach((i, k) => R(x + i, wy + wh - 1, 2, 2, k % 2 ? '#f07fa6' : '#f2e35b')); }
        if (st.awning && last) for (let i = 0; i < 16; i += 2) { R(x + i, wy - 5, 2, 5, st.awning[(i / 2) % 2]); R(x + i, wy, 2, 1, SH(st.awning[(i / 2) % 2], -0.3)); }
      }
      b.windows.push({ x: b.x * TS + x + 8, y: b.y * TS + wy + 5 });
    }
  }
  if (st.columns) for (const x of [doorX - 20, doorX - 10, doorX + 26, doorX + 36]) {
    if (x < 2 || x > W - 6) continue;
    R(x, wallY + 3, 5, wallH - 6, '#f7f3ea'); R(x, wallY + 3, 1, wallH - 6, '#d8d0c0'); R(x - 1, wallY + 2, 7, 2, '#e8e2d4'); R(x - 1, H - 5, 7, 2, '#e8e2d4');
  }
  if (st.bigdoor) {
    R(doorX - 8, H - 30, 32, 27, SH(st.door, -0.2));
    for (let y = H - 29; y < H - 3; y += 3) R(doorX - 7, y, 30, 1, SH(st.door, 0.15));
  }
  if (b.house && st.porch) { R(doorX - 3, H - 4, 22, 4, SH(st.trim, -0.25)); R(doorX - 3, H - 22, 2, 18, st.trim); R(doorX + 17, H - 22, 2, 18, st.trim); R(doorX - 5, H - 24, 26, 3, SH(st.roof, -0.1)); }
  R(doorX + 1, H - 20, 14, 17, st.trim);
  R(doorX + 2, H - 19, 12, 16, st.door);
  R(doorX + 3, H - 18, 4, 6, SH(st.door, 0.18)); R(doorX + 9, H - 18, 4, 6, SH(st.door, 0.18)); R(doorX + 3, H - 10, 4, 5, SH(st.door, 0.1)); R(doorX + 9, H - 10, 4, 5, SH(st.door, 0.1));
  R(doorX + 11, H - 11, 2, 2, '#e8c35a');
  R(doorX, H - 3, 16, 3, '#9a948a');
  if (st.icon) {
    const sy = st.bigdoor ? H - 40 : H - 33;
    R(doorX - 1, sy, 18, 11, SH(st.trim, -0.25)); R(doorX, sy + 1, 16, 9, st.trim);
    drawIcon(R, st.icon, doorX + 3, sy + 1);
  }
  if (st.flat) {
    R(0, 0, W, roofH, st.roof); R(0, 0, W, 3, SH(st.roof, 0.25)); R(0, roofH - 4, W, 4, SH(st.roof, -0.3));
    R(3, 4, W - 6, roofH - 9, SH(st.roof, -0.08));
    for (let i = 0; i < Math.floor(W / 40); i++) { const x = 10 + i * 40; R(x, 7, 10, 6, '#8a8f96'); R(x, 7, 10, 2, '#a3a8af'); }
  } else {
    R(0, 0, W, roofH, st.roof);
    const ridge = Math.floor(roofH * 0.38);
    for (let y = 2; y < roofH; y += 4) {
      R(0, y, W, 1, SH(st.roof, -0.2));
      for (let x = ((y / 4) % 2) * 4; x < W; x += 8) R(x, y - 3, 1, 3, SH(st.roof, -0.12));
    }
    R(0, 0, W, ridge, SH(st.roof, 0.12));
    for (let y = 2; y < ridge; y += 4) R(0, y, W, 1, SH(st.roof, -0.06));
    R(0, ridge, W, 1, SH(st.roof, 0.35));
    R(0, roofH - 2, W, 2, SH(st.roof, -0.38));
    R(-3, roofH - 1, W + 6, 2, SH(st.roof, -0.5));
    R(-3, 0, 3, roofH, SH(st.roof, -0.3)); R(W, 0, 3, roofH, SH(st.roof, -0.3));
  }
  if (st.chimney || b.chimney) { const x = W - 22; R(x, -10, 9, 16, '#8a4b3a'); R(x - 1, -11, 11, 3, '#6b3a2a'); for (let y = -7; y < 5; y += 3) R(x, y, 9, 1, '#7a4030'); b.chimneyAt = { x: b.x * TS + x + 4, y: b.y * TS - 12 }; }
  if (st.flag) { R(W / 2 - 1, -18, 2, 20, '#666'); R(W / 2 + 1, -18, 12, 8, '#3a6ad2'); R(W / 2 + 1, -14, 12, 1, '#fff'); R(W / 2 + 1, -12, 12, 1, '#d23a3a'); R(W / 2 + 1, -10, 12, 1, '#fff'); }
  if (st.clock) { pcirc(g, pad + W / 2, 20 + roofH * 0.45, 7, 7, '#f4f1ea'); R(W / 2 - 0.5, roofH * 0.45 - 5, 1, 5, '#222'); R(W / 2, roofH * 0.45 - 0.5, 4, 1, '#222'); }
  if (st.steeple) { const x = W / 2 - 8; R(x, -18, 16, 22, SH(wall, -0.05)); R(x + 5, -14, 6, 8, '#3a3a40'); for (let i = 0; i < 9; i++) R(x - 1 + i, -19 - i, 18 - i * 2, 1, st.roof); R(x + 7, -34, 2, 6, '#e8c35a'); R(x + 5, -32, 6, 2, '#e8c35a'); }
  if (st.bell) { R(W / 2 - 6, -12, 12, 14, SH(wall, -0.1)); R(W / 2 - 3, -9, 6, 6, '#c9a24a'); R(W / 2 - 8, -14, 16, 3, st.roof); }
  ART.outline(c, '#2b1d1a');
  b.imgPad = pad;
  return c;
};

// =====================================================================================
// İÇ MEKÂN
// =====================================================================================
ART.floor = function (g, kind, colors, px, py, r, tx, ty) {
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(px + x, py + y, w, h); };
  const a = colors[0], b = colors[1] || SH(a, -0.12);
  switch (kind) {
    case 'wood':
      R(0, 0, 16, 16, a);
      for (let y = 0; y < 16; y += 4) { R(0, y, 16, 1, b); R(((ty * 5 + y * 3 + tx * 7) % 14) + 1, y + 1, 1, 3, b); }
      R(r.int(0, 15), r.int(0, 15), 2, 1, SH(a, 0.07));
      break;
    case 'parquet':
      for (let y = 0; y < 16; y += 8) for (let x = 0; x < 16; x += 8) {
        const v = ((x + y) / 8 + tx + ty) % 2;
        R(x, y, 8, 8, v ? a : b);
        for (let k = 2; k < 8; k += 2) { if (v) R(x, y + k, 8, 1, SH(a, -0.08)); else R(x + k, y, 1, 8, SH(b, -0.08)); }
      }
      break;
    case 'tile': R(0, 0, 16, 16, a); R(0, 0, 16, 1, b); R(0, 0, 1, 16, b); R(2, 2, 3, 1, SH(a, 0.1)); break;
    case 'checker': R(0, 0, 16, 16, (tx + ty) % 2 ? a : b); R(1, 1, 3, 1, SH((tx + ty) % 2 ? a : b, 0.12)); break;
    case 'carpet': R(0, 0, 16, 16, a); for (let i = 0; i < 5; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, b); break;
    case 'concrete': R(0, 0, 16, 16, a); for (let i = 0; i < 5; i++) R(r.int(0, 15), r.int(0, 15), 1, 1, b); if ((tx + ty * 3) % 7 === 0) R(2, 7, 7, 1, b); break;
    case 'stone': R(0, 0, 16, 16, a); R(0, 7, 16, 1, b); R(0, 15, 16, 1, b); R(ty % 2 ? 4 : 11, 0, 1, 7, b); R(ty % 2 ? 11 : 4, 8, 1, 7, b); break;
    case 'dirt': R(0, 0, 16, 16, a); for (let i = 0; i < 6; i++) R(r.int(0, 15), r.int(0, 15), 2, 1, b); break;
  }
};

const FURN = {};
function F(name, w, h, solid, draw, extra) { FURN[name] = Object.assign({ w, h, solid, draw }, extra || {}); }
ART.FURN = FURN;
const wood = '#8a5a32', woodD = '#6b4426', woodL = '#a8743f';
function circ(R, cx, cy, r, col) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) R(cx + x, cy + y, 1, 1, col); }

F('desk', 2, 1, 'all', (R, c) => { const t = c || woodL; R(0, 2, 32, 9, t); R(0, 2, 32, 2, SH(t, 0.2)); R(1, 11, 3, 5, SH(t, -0.3)); R(28, 11, 3, 5, SH(t, -0.3)); R(4, 7, 22, 4, SH(t, -0.15)); R(13, 8, 4, 1, '#c9a24a'); R(9, 3, 7, 2, '#f4f1ea'); R(19, 2, 4, 3, '#d9d2c0'); R(25, 1, 3, 3, '#3a6ad2'); });
F('cdesk', 2, 1, 'all', (R) => { R(0, 4, 32, 8, woodL); R(0, 4, 32, 2, '#c08a52'); R(1, 12, 3, 4, woodD); R(28, 12, 3, 4, woodD); R(8, -8, 16, 11, '#2d3138'); R(9, -7, 14, 8, '#5fb3d9'); R(10, -6, 6, 1, '#d6f1ff'); R(10, -4, 9, 1, '#d6f1ff'); R(10, -2, 5, 1, '#d6f1ff'); R(14, 3, 4, 2, '#2d3138'); R(9, 6, 11, 2, '#ddd'); R(23, 6, 3, 2, '#ddd'); });
F('typedesk', 2, 1, 'all', (R) => { R(0, 3, 32, 9, woodD); R(0, 3, 32, 2, wood); R(1, 12, 3, 4, '#3a2414'); R(28, 12, 3, 4, '#3a2414'); R(8, -2, 14, 7, '#2d3138'); R(10, -4, 10, 3, '#f4f1ea'); R(9, 2, 12, 2, '#555'); R(24, 1, 5, 4, '#f4f1ea'); });
F('chair', 1, 1, 'none', (R, c) => { const t = c || '#4b555e'; R(4, 2, 8, 7, t); R(4, 2, 8, 1, SH(t, 0.2)); R(4, 9, 8, 3, SH(t, 0.12)); R(5, 12, 1, 4, '#333'); R(10, 12, 1, 4, '#333'); });
F('couch', 3, 1, 'all', (R) => { R(0, -4, 48, 8, '#6b3f24'); R(0, -4, 48, 2, '#7d4c2e'); R(0, 2, 48, 12, '#8a5232'); R(0, 2, 5, 13, '#6b3f24'); R(43, 2, 5, 13, '#6b3f24'); R(6, 4, 17, 7, '#9b6240'); R(25, 4, 17, 7, '#9b6240'); R(8, 5, 6, 1, '#b07a52'); R(27, 5, 6, 1, '#b07a52'); R(2, 14, 3, 2, '#3a2414'); R(43, 14, 3, 2, '#3a2414'); for (let x = 3; x < 46; x += 4) R(x, -2, 1, 1, '#c9a24a'); });
F('sofa', 2, 1, 'all', (R, c) => { const col = c || '#5a6e9a'; R(0, -3, 32, 7, SH(col, -0.2)); R(0, 3, 32, 11, col); R(0, 3, 4, 12, SH(col, -0.2)); R(28, 3, 4, 12, SH(col, -0.2)); R(5, 5, 22, 1, SH(col, 0.2)); R(15, 4, 1, 8, SH(col, -0.1)); R(6, 6, 6, 4, SH(col, 0.12)); });
F('armchair', 1, 1, 'all', (R, c) => { const col = c || '#7a2f3a'; R(1, -3, 14, 7, SH(col, -0.2)); R(1, 3, 14, 11, col); R(1, 3, 3, 12, SH(col, -0.2)); R(12, 3, 3, 12, SH(col, -0.2)); R(5, 5, 6, 1, SH(col, 0.2)); });
F('bookshelf', 2, 2, 'base', (R, c) => { R(0, 0, 32, 32, woodD); R(2, 2, 28, 28, '#4b2e1c'); const cs = ['#a33a2e', '#3a6ad2', '#e8c35a', '#3aa04a', '#7a3a8a', '#ddd', '#c96f4a']; for (let s = 0; s < 3; s++) { R(2, 10 + s * 9, 28, 2, woodD); for (let i = 0; i < 9; i++) R(3 + i * 3, 3 + s * 9 + (i % 3 === 0 ? 1 : 0), 2, 7 - (i % 3 === 0 ? 1 : 0), cs[(i * 5 + s * 3) % 7]); } });
F('libshelf', 3, 1, 'all', (R) => { R(0, -14, 48, 30, woodD); R(2, -12, 44, 26, '#4b2e1c'); const cs = ['#a33a2e', '#3a6ad2', '#e8c35a', '#3aa04a', '#7a3a8a', '#ddd']; for (let s = 0; s < 3; s++) { R(2, -4 + s * 8, 44, 2, woodD); for (let i = 0; i < 14; i++) R(3 + i * 3, -11 + s * 8, 2, 7, cs[(i * 7 + s) % 6]); } });
F('plant', 1, 1, 'all', (R) => { R(4, 9, 8, 7, '#b0603a'); R(4, 9, 8, 2, '#c97a4a'); R(5, 14, 6, 2, '#8a4a2a'); R(7, -2, 2, 11, '#3a7d38'); R(2, 0, 6, 4, '#4f9a45'); R(8, -3, 6, 4, '#4f9a45'); R(3, 4, 5, 3, '#3a7d38'); R(9, 3, 5, 3, '#6bb85a'); R(4, 1, 2, 1, '#7fcf6a'); });
F('plant2', 1, 1, 'all', (R) => { R(4, 10, 8, 6, '#e8e2d0'); R(4, 10, 8, 1, '#fff'); for (let i = 0; i < 6; i++) R(3 + i * 2, -4 + (i % 2) * 3, 2, 14 - (i % 2) * 3, i % 2 ? '#4f9a45' : '#3a7d38'); });
F('table', 2, 2, 'all', (R, c) => { const col = c || woodL; R(0, 2, 32, 22, col); R(0, 2, 32, 2, SH(col, 0.2)); R(0, 24, 32, 3, SH(col, -0.25)); R(2, 27, 3, 5, woodD); R(27, 27, 3, 5, woodD); R(6, 8, 6, 5, '#f4f1ea'); R(18, 12, 5, 6, '#7a2f3a'); R(19, 13, 3, 2, '#a34a5a'); R(13, 6, 4, 4, '#e8e2d0'); });
F('dining', 3, 2, 'all', (R) => { R(0, 4, 48, 20, '#8a5a32'); R(0, 4, 48, 2, '#a8743f'); R(2, 6, 44, 16, '#f4f1ea'); R(2, 20, 44, 2, '#d9d2c0'); [8, 20, 32].forEach((x) => { circ(R, x + 3, 13, 3, '#fff'); circ(R, x + 3, 13, 1, '#e8c35a'); }); R(22, 6, 2, 5, '#f2d48a'); R(22, 4, 2, 2, '#ffb03a'); R(2, 24, 3, 6, woodD); R(43, 24, 3, 6, woodD); });
F('ctable', 1, 1, 'all', (R, c) => { R(1, 2, 14, 8, c || '#e8dcc8'); R(1, 2, 14, 1, '#fff'); R(7, 10, 2, 5, '#4b555e'); R(4, 15, 8, 1, '#4b555e'); R(4, 4, 4, 3, '#f4f1ea'); R(5, 3, 2, 1, '#8a5a32'); R(10, 3, 2, 3, '#c94a4a'); });
F('counter', 4, 1, 'all', (R, c) => { const col = c || woodD; R(0, 0, 64, 16, col); R(0, 0, 64, 4, SH(col, 0.35)); for (let x = 4; x < 64; x += 12) R(x, 6, 1, 9, SH(col, -0.25)); }, { reach: true });
F('counter5', 5, 1, 'all', (R, c) => { const col = c || woodD; R(0, 0, 80, 16, col); R(0, 0, 80, 4, SH(col, 0.35)); for (let x = 4; x < 80; x += 12) R(x, 6, 1, 9, SH(col, -0.25)); }, { reach: true });
F('coffee', 1, 1, 'none', (R) => { R(3, -6, 10, 10, '#4b555e'); R(4, -5, 8, 3, '#c0c6cc'); R(6, 0, 4, 3, '#222'); R(10, -4, 2, 2, '#d23a3a'); });
F('register', 1, 1, 'none', (R) => { R(2, -4, 12, 8, '#3a3f47'); R(3, -3, 10, 3, '#9fdc9f'); R(2, 4, 12, 2, '#2a2f37'); });
F('kitchen', 2, 2, 'base', (R) => { R(0, 14, 32, 18, '#d9d2c0'); R(0, 14, 32, 3, '#f4f1ea'); R(2, 20, 12, 10, '#c9c0aa'); R(18, 20, 12, 10, '#c9c0aa'); R(7, 24, 2, 1, '#888'); R(23, 24, 2, 1, '#888'); R(0, 0, 32, 10, '#c9c0aa'); R(2, 2, 12, 6, '#e8e2d0'); R(18, 2, 12, 6, '#e8e2d0'); R(6, 9, 8, 6, '#c0c6cc'); R(14, 10, 2, 2, '#c0c6cc'); R(7, 8, 6, 1, '#333'); R(20, 10, 5, 5, '#f4f1ea'); R(21, 11, 3, 2, '#c08a52'); });
F('stove', 1, 2, 'base', (R) => { R(1, 14, 14, 18, '#e8e6df'); R(1, 14, 14, 3, '#fff'); circ(R, 5, 18, 2, '#333'); circ(R, 11, 18, 2, '#333'); R(3, 22, 10, 8, '#2d3138'); R(4, 23, 8, 2, '#555'); R(2, 0, 12, 8, '#c0c6cc'); });
F('fridge', 1, 2, 'base', (R) => { R(1, 2, 14, 30, '#e8eef2'); R(1, 2, 14, 2, '#fff'); R(1, 14, 14, 1, '#b8c0c6'); R(11, 6, 2, 6, '#9aa6b2'); R(11, 17, 2, 8, '#9aa6b2'); R(3, 5, 3, 3, '#e8c35a'); R(6, 7, 3, 3, '#d95f5f'); });
F('sink', 2, 2, 'base', (R) => { R(0, 14, 32, 18, '#d9d2c0'); R(0, 14, 32, 3, '#f4f1ea'); R(6, 15, 20, 6, '#9aa6b2'); R(7, 16, 18, 4, '#c0dfe8'); R(15, 9, 2, 6, '#c0c6cc'); R(13, 9, 6, 1, '#c0c6cc'); R(2, 22, 13, 9, '#c9c0aa'); R(17, 22, 13, 9, '#c9c0aa'); R(0, 0, 32, 10, '#c9c0aa'); R(2, 2, 28, 6, '#e8e2d0'); });
F('board', 3, 2, 'none', (R) => { R(0, 2, 48, 26, woodD); R(2, 4, 44, 22, '#c9a06a'); R(5, 7, 8, 7, '#f4f1ea'); R(18, 6, 9, 9, '#f4f1ea'); R(33, 8, 9, 7, '#f4f1ea'); R(10, 17, 9, 7, '#f4f1ea'); R(28, 17, 8, 7, '#f4f1ea'); R(9, 10, 12, 1, '#d23a3a'); R(24, 13, 12, 1, '#d23a3a'); R(15, 15, 1, 4, '#d23a3a'); R(31, 15, 1, 3, '#d23a3a'); R(20, 8, 4, 4, '#888'); R(6, 8, 3, 3, '#c9a882'); R(34, 9, 3, 3, '#c9a882'); });
F('lionboard', 3, 2, 'none', (R) => { R(0, 2, 48, 26, '#3a2414'); R(2, 4, 44, 22, '#5a4a3a'); R(20, 6, 8, 8, '#e8c35a'); R(22, 8, 1, 1, '#222'); R(25, 8, 1, 1, '#222'); R(6, 16, 7, 7, '#f4f1ea'); R(18, 17, 7, 7, '#f4f1ea'); R(32, 16, 7, 7, '#f4f1ea'); R(23, 14, 1, 3, '#d23a3a'); R(10, 15, 26, 1, '#d23a3a'); });
F('window', 2, 2, 'none', (R) => { R(2, 4, 28, 20, '#f4f1ea'); R(4, 6, 24, 16, '#9cc6dc'); R(4, 6, 24, 3, '#c0e0ef'); R(15, 6, 2, 16, '#f4f1ea'); R(4, 13, 24, 2, '#f4f1ea'); R(6, 9, 4, 3, '#e6f4fa'); R(0, 24, 32, 2, '#d9d2c0'); R(0, 3, 4, 22, '#c96f4a'); R(28, 3, 4, 22, '#c96f4a'); R(0, 2, 32, 2, '#8a5a32'); });
F('stainedglass', 2, 2, 'none', (R) => { R(4, 2, 24, 26, '#3a3a40'); const cs = ['#d23a3a', '#3a6ad2', '#e8c35a', '#3aa04a', '#7a3a8a']; for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) R(6 + x * 5, 4 + y * 4, 4, 3, cs[(x + y * 2) % 5]); R(4, 0, 24, 3, '#3a3a40'); });
F('cabinet', 1, 1, 'all', (R) => { R(1, -6, 14, 22, '#7d8a96'); R(1, -6, 14, 2, '#9aa6b2'); R(3, -2, 10, 7, '#6b7682'); R(3, 7, 10, 7, '#6b7682'); R(6, 1, 4, 1, '#c0c6cc'); R(6, 10, 4, 1, '#c0c6cc'); });
F('wardrobe', 2, 2, 'base', (R) => { R(1, 0, 30, 32, woodD); R(1, 0, 30, 3, wood); R(3, 4, 12, 26, wood); R(17, 4, 12, 26, wood); R(13, 15, 2, 3, '#c9a24a'); R(17, 15, 2, 3, '#c9a24a'); });
F('dresser', 2, 1, 'all', (R) => { R(1, -4, 30, 20, wood); R(1, -4, 30, 2, woodL); for (let y = 0; y < 3; y++) { R(3, -1 + y * 5, 26, 4, woodD); R(14, 0 + y * 5, 4, 1, '#c9a24a'); } R(6, -10, 6, 6, '#e8e2d0'); R(20, -9, 5, 5, '#c94a4a'); });
F('nightstand', 1, 1, 'all', (R) => { R(2, 2, 12, 12, wood); R(2, 2, 12, 2, woodL); R(4, 7, 8, 1, woodD); R(5, -4, 6, 6, '#f2d48a'); R(7, 2, 2, 1, '#555'); });
F('rug', 3, 2, 'none', (R, c) => { const col = c || '#8a3a3a'; R(0, 2, 48, 28, SH(col, -0.2)); R(2, 4, 44, 24, col); R(6, 8, 36, 16, SH(col, 0.15)); R(10, 12, 28, 8, col); for (let x = 0; x < 48; x += 4) { R(x, 1, 2, 1, SH(col, 0.3)); R(x, 30, 2, 1, SH(col, 0.3)); } });
F('rug6', 6, 3, 'none', (R, c) => { const col = c || '#5a3a6b'; R(0, 2, 96, 44, SH(col, -0.2)); R(3, 5, 90, 38, col); R(10, 12, 76, 24, SH(col, 0.15)); R(20, 18, 56, 12, col); });
F('roundrug', 2, 2, 'none', (R, c) => { const col = c || '#5a8a6b'; circ(R, 16, 16, 14, SH(col, -0.2)); circ(R, 16, 16, 12, col); circ(R, 16, 16, 7, SH(col, 0.15)); });
F('slab', 2, 1, 'all', (R) => { R(0, 2, 32, 10, '#c0c6cc'); R(0, 2, 32, 2, '#e3e7ea'); R(3, 12, 3, 4, '#7d8a96'); R(26, 12, 3, 4, '#7d8a96'); R(2, -2, 28, 8, '#eef2f3'); R(4, -3, 7, 6, '#eef2f3'); R(2, 5, 28, 1, '#c9d0d4'); });
F('morgue', 3, 2, 'none', (R) => { R(0, 2, 48, 28, '#9aa6b2'); for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) { R(2 + x * 15, 4 + y * 13, 14, 12, '#c0c6cc'); R(6 + x * 15, 9 + y * 13, 6, 2, '#5c6670'); } });
F('labdesk', 2, 1, 'all', (R) => { R(0, 3, 32, 13, '#eef2f3'); R(0, 3, 32, 2, '#fff'); R(0, 13, 32, 3, '#c0c6cc'); R(5, -6, 4, 10, '#333'); R(4, -7, 7, 3, '#555'); R(3, 2, 9, 2, '#555'); R(17, 0, 3, 5, '#5fb3d9'); R(22, -1, 3, 6, '#a3d95f'); R(26, 1, 3, 4, '#d95f8a'); });
F('crate', 1, 1, 'all', (R) => { R(1, -2, 14, 17, '#b0803e'); R(1, -2, 14, 2, '#c99a52'); R(1, 6, 14, 1, '#8a5a32'); R(1, -2, 1, 17, '#8a5a32'); R(14, -2, 1, 17, '#8a5a32'); R(2, 0, 12, 1, '#8a5a32'); });
F('barrel', 1, 1, 'all', (R) => { R(2, -2, 12, 17, '#8a5a32'); R(2, 0, 12, 2, '#555'); R(2, 10, 12, 2, '#555'); R(3, -2, 10, 2, '#a8743f'); R(4, 2, 2, 8, '#a8743f'); });
F('rack', 3, 2, 'base', (R) => { R(0, 0, 3, 32, '#4b555e'); R(45, 0, 3, 32, '#4b555e'); for (let s = 0; s < 3; s++) { R(0, 8 + s * 10, 48, 2, '#5c6670'); R(4 + s * 6, 1 + s * 10, 12, 7, '#b0803e'); R(24 - s * 3, 1 + s * 10, 10, 7, '#c99a52'); } });
F('forklift', 2, 2, 'all', (R) => { R(4, 6, 22, 18, '#e8b02e'); R(4, 6, 22, 3, '#ffd25a'); R(8, 0, 14, 8, '#333'); R(9, 1, 12, 6, '#9cc6dc'); R(26, 0, 3, 28, '#555'); R(26, 24, 6, 2, '#777'); circ(R, 9, 26, 4, '#222'); circ(R, 21, 26, 4, '#222'); });
F('statue', 1, 2, 'base', (R) => { R(2, 20, 12, 12, '#e3e0d8'); R(2, 20, 12, 2, '#fff'); R(5, 2, 6, 6, '#cfcac0'); R(4, 8, 8, 12, '#cfcac0'); R(6, 3, 2, 2, '#b5afa3'); });
F('artwall', 2, 2, 'none', (R, c) => { R(3, 3, 26, 20, '#c9a24a'); R(5, 5, 22, 16, c || '#3a6ad2'); R(8, 8, 8, 6, SH(c || '#3a6ad2', 0.35)); R(16, 13, 9, 6, SH(c || '#3a6ad2', -0.3)); R(0, 26, 32, 2, '#ddd'); });
F('painting', 1, 2, 'none', (R, c) => { R(2, 6, 12, 14, '#8a6a2a'); R(3, 7, 10, 12, c || '#5a8a6b'); R(4, 13, 8, 5, SH(c || '#5a8a6b', -0.25)); circ(R, 9, 10, 2, '#e8c35a'); });
F('clock', 1, 2, 'none', (R) => { circ(R, 8, 12, 6, '#8a5a32'); circ(R, 8, 12, 5, '#f4f1ea'); R(8, 8, 1, 4, '#222'); R(8, 12, 3, 1, '#222'); });
F('bench', 2, 1, 'all', (R) => { R(1, 4, 30, 7, '#333'); R(1, 4, 30, 2, '#555'); R(3, 11, 2, 5, '#222'); R(27, 11, 2, 5, '#222'); });
F('pew', 4, 1, 'all', (R) => { R(0, -4, 64, 6, '#6b3a24'); R(0, -4, 64, 2, '#8a5a32'); R(0, 4, 64, 7, '#7a4a2a'); R(0, 4, 64, 2, '#9a6a3e'); R(1, 11, 3, 5, '#4b2e1c'); R(60, 11, 3, 5, '#4b2e1c'); });
F('altar', 3, 1, 'all', (R) => { R(0, 0, 48, 16, '#e8e2d0'); R(0, 0, 48, 3, '#fff'); R(18, 3, 12, 13, '#c94a4a'); R(22, -10, 4, 10, '#e8c35a'); R(20, -7, 8, 2, '#e8c35a'); R(4, -6, 2, 6, '#f4f1ea'); R(42, -6, 2, 6, '#f4f1ea'); R(4, -8, 2, 2, '#ffb03a'); R(42, -8, 2, 2, '#ffb03a'); });
F('easel', 1, 1, 'all', (R) => { R(3, -8, 2, 24, woodD); R(11, -8, 2, 24, woodD); R(1, -10, 14, 14, '#f4f1ea'); R(3, -8, 10, 10, '#d95f5f'); R(5, -6, 5, 4, '#e8c35a'); });
F('fireplace', 2, 2, 'none', (R) => { R(0, 2, 32, 30, '#9a8a7a'); R(0, 2, 32, 4, '#b5a594'); R(6, 12, 20, 20, '#2b1d1a'); R(9, 22, 14, 6, '#e86a2e'); R(12, 18, 8, 6, '#ffb03a'); R(14, 16, 3, 4, '#ffe08a'); R(2, 6, 4, 4, '#e8c35a'); });
F('piano', 2, 2, 'all', (R) => { R(0, 0, 32, 26, '#1f1b20'); R(2, 2, 28, 4, '#3a3540'); R(0, 18, 32, 6, '#f4f1ea'); for (let x = 2; x < 32; x += 4) R(x, 18, 2, 3, '#1f1b20'); R(2, 26, 3, 6, '#1f1b20'); R(27, 26, 3, 6, '#1f1b20'); R(12, 4, 8, 6, '#f4f1ea'); });
F('gclock', 1, 2, 'base', (R) => { R(2, 0, 12, 32, woodD); R(4, 3, 8, 8, '#f4f1ea'); R(7, 5, 1, 4, '#222'); R(8, 7, 3, 1, '#222'); R(5, 14, 6, 14, '#4b2e1c'); R(7, 16, 2, 9, '#e8c35a'); });
F('bed', 2, 2, 'all', (R, c) => { const col = c || '#5a7ec9'; R(0, 0, 32, 32, woodD); R(0, 0, 32, 4, wood); R(2, 4, 28, 26, '#f4f1ea'); R(4, 5, 10, 6, '#fff'); R(18, 5, 10, 6, '#fff'); R(2, 13, 28, 17, col); R(2, 13, 28, 2, SH(col, 0.25)); for (let x = 4; x < 30; x += 6) R(x, 18, 3, 1, SH(col, -0.15)); });
F('bed1', 1, 2, 'all', (R, c) => { const col = c || '#c94a4a'; R(0, 0, 16, 32, woodD); R(1, 4, 14, 26, '#f4f1ea'); R(3, 5, 10, 6, '#fff'); R(1, 13, 14, 17, col); R(1, 13, 14, 2, SH(col, 0.25)); });
F('tv', 2, 2, 'base', (R) => { R(0, 18, 32, 14, woodD); R(0, 18, 32, 2, woodL); R(3, 0, 26, 17, '#1f1b20'); R(5, 2, 22, 13, '#2f4a5e'); R(7, 4, 6, 3, '#4a7a9a'); });
F('stool', 1, 1, 'none', (R) => { R(4, 4, 8, 4, '#a33a2e'); R(4, 4, 8, 1, '#c95a4a'); R(7, 8, 2, 7, '#555'); R(5, 14, 6, 1, '#555'); });
F('bottles', 5, 2, 'none', (R) => { R(0, 2, 80, 28, '#4b2e1c'); for (let s = 0; s < 2; s++) { R(0, 14 + s * 13, 80, 2, '#6b4426'); for (let i = 0; i < 16; i++) { const col = ['#3aa04a', '#a33a2e', '#e8c35a', '#7a8fa0', '#6b2d6b'][(i * 3 + s) % 5]; R(3 + i * 5, 5 + s * 13, 3, 9, col); R(4 + i * 5, 3 + s * 13, 1, 2, col); R(3 + i * 5, 6 + s * 13, 1, 3, SH(col, 0.4)); } } });
F('jukebox', 1, 2, 'base', (R) => { R(1, 4, 14, 28, '#a33a2e'); R(1, 2, 14, 6, '#e8c35a'); R(3, 9, 10, 8, '#ffb03a'); R(3, 20, 10, 8, '#2b1d1a'); R(4, 21, 8, 1, '#e8c35a'); R(4, 24, 8, 1, '#e8c35a'); });
F('pooltable', 3, 2, 'all', (R) => { R(0, 2, 48, 26, '#5a3a24'); R(3, 5, 42, 20, '#2f7a4a'); R(3, 5, 2, 2, '#111'); R(43, 5, 2, 2, '#111'); R(3, 23, 2, 2, '#111'); R(43, 23, 2, 2, '#111'); R(14, 12, 3, 3, '#fff'); R(30, 14, 3, 3, '#d23a3a'); R(33, 11, 3, 3, '#e8c35a'); R(4, 28, 3, 4, '#3a2414'); R(41, 28, 3, 4, '#3a2414'); });
F('reception', 4, 1, 'all', (R) => { R(0, 0, 64, 16, '#7a2f3a'); R(0, 0, 64, 4, '#c9a24a'); R(4, 6, 56, 1, '#5a1f2a'); R(46, -6, 6, 6, '#e8c35a'); R(48, -8, 2, 2, '#e8c35a'); R(10, -4, 8, 4, '#f4f1ea'); }, { reach: true });
F('keyboard', 2, 2, 'none', (R) => { R(2, 6, 28, 20, woodD); for (let y = 0; y < 3; y++) for (let x = 0; x < 5; x++) { R(5 + x * 5, 9 + y * 6, 2, 1, '#e8c35a'); R(5 + x * 5, 10 + y * 6, 2, 3, '#c9a24a'); } });
F('elevator', 2, 2, 'none', (R) => { R(2, 2, 28, 30, '#c9a24a'); R(4, 6, 12, 26, '#c0c6cc'); R(16, 6, 12, 26, '#aab2ba'); R(14, 3, 4, 2, '#d23a3a'); });
F('barrelrack', 4, 2, 'base', (R) => { R(0, 18, 64, 14, woodD); for (let i = 0; i < 4; i++) { circ(R, 8 + i * 16, 14, 7, '#8a5a32'); circ(R, 8 + i * 16, 14, 4, '#6b4426'); R(7 + i * 16, 13, 2, 2, '#333'); } });
F('grapes', 1, 1, 'all', (R) => { R(1, 4, 14, 11, '#b0803e'); R(1, 4, 14, 2, '#c99a52'); [[3, 1], [6, 2], [9, 1], [4, 4], [8, 4], [11, 3]].forEach(([x, y]) => R(x, y, 3, 3, '#6b2d6b')); });
F('safe', 1, 1, 'all', (R) => { R(1, -4, 14, 19, '#4b555e'); R(1, -4, 14, 2, '#7d8a96'); R(3, -1, 10, 13, '#5c6670'); circ(R, 8, 5, 3, '#c0c6cc'); R(7, 4, 2, 2, '#333'); R(11, 3, 1, 4, '#c0c6cc'); });
F('vault', 2, 2, 'none', (R) => { R(0, 0, 32, 32, '#5c6670'); circ(R, 16, 16, 13, '#7d8a96'); circ(R, 16, 16, 10, '#9aa6b2'); circ(R, 16, 16, 3, '#4b555e'); R(15, 6, 2, 20, '#4b555e'); R(6, 15, 20, 2, '#4b555e'); });
F('lamp', 1, 1, 'all', (R) => { R(7, -4, 2, 18, '#555'); R(4, 14, 8, 2, '#555'); R(3, -10, 10, 7, '#f2d48a'); R(4, -9, 8, 1, '#fff2c0'); });
F('shelf', 3, 1, 'all', (R, c) => { R(0, -10, 48, 26, '#c9a06a'); R(0, -10, 48, 2, '#d9b07a'); const cs = c === 'fish' ? ['#9fc2ff', '#c0c6cc', '#f4a07a'] : ['#c94a4a', '#3aa04a', '#e8c35a', '#3a6ad2', '#f4f1ea']; for (let s = 0; s < 3; s++) { R(0, -2 + s * 7, 48, 1, '#8a5a32'); for (let i = 0; i < 10; i++) R(2 + Math.round(i * 4.6), -8 + s * 7, 3, 5, cs[(i + s) % cs.length]); } });
F('stall', 3, 1, 'all', (R) => { R(0, 0, 48, 16, '#8a6a46'); R(0, 0, 48, 4, '#e8eef2'); for (let i = 0; i < 6; i++) { R(3 + i * 7, -3, 6, 3, '#9fc2ff'); R(3 + i * 7, -3, 2, 1, '#fff'); } R(0, -14, 48, 4, '#2f6b9a'); for (let i = 0; i < 48; i += 8) R(i, -14, 4, 4, '#f3efe6'); R(1, -10, 2, 10, '#555'); R(45, -10, 2, 10, '#555'); }, { reach: true });
F('schooldesk', 1, 1, 'all', (R) => { R(1, 2, 14, 8, '#c99a52'); R(1, 2, 14, 2, '#d9b07a'); R(2, 10, 2, 6, '#555'); R(12, 10, 2, 6, '#555'); R(4, 3, 5, 3, '#f4f1ea'); });
F('blackboard', 4, 2, 'none', (R) => { R(0, 2, 64, 24, '#8a5a32'); R(2, 4, 60, 20, '#2f4a3a'); R(6, 8, 20, 1, '#e8e6df'); R(6, 12, 30, 1, '#e8e6df'); R(6, 16, 14, 1, '#e8e6df'); R(40, 8, 12, 10, '#e8e6df'); R(41, 9, 10, 8, '#2f4a3a'); });
F('press', 3, 2, 'all', (R) => { R(0, 4, 48, 26, '#3a3f47'); R(0, 4, 48, 3, '#5a5f67'); circ(R, 12, 16, 7, '#5a5f67'); circ(R, 36, 16, 7, '#5a5f67'); R(4, 26, 40, 4, '#f4f1ea'); R(8, 0, 32, 6, '#2a2f37'); });
F('flag', 1, 2, 'none', (R, c) => { R(3, 0, 2, 32, '#8a7a5a'); R(5, 2, 10, 8, c || '#3a6ad2'); R(5, 5, 10, 1, '#fff'); R(5, 7, 10, 1, '#d23a3a'); circ(R, 4, 0, 1, '#e8c35a'); });
F('cell', 3, 2, 'base', (R) => { R(0, 0, 48, 32, '#5c6670'); R(2, 2, 44, 28, '#3a3f47'); for (let x = 3; x < 46; x += 5) R(x, 2, 2, 30, '#9aa6b2'); R(0, 14, 48, 2, '#9aa6b2'); R(20, 16, 8, 3, '#7d8a96'); });
F('evidence', 3, 2, 'none', (R) => { R(0, 2, 48, 26, '#2b2f38'); R(2, 4, 44, 22, '#3a3f4a'); for (let i = 0; i < 6; i++) R(4 + (i % 3) * 14, 6 + Math.floor(i / 3) * 10, 10, 8, '#f4f1ea'); R(10, 10, 20, 1, '#d23a3a'); R(24, 16, 14, 1, '#d23a3a'); });
F('candles', 1, 1, 'none', (R) => { R(3, 2, 2, 8, '#f4f1ea'); R(7, 0, 2, 10, '#f4f1ea'); R(11, 3, 2, 7, '#f4f1ea'); R(3, 0, 2, 2, '#ffb03a'); R(7, -2, 2, 2, '#ffb03a'); R(11, 1, 2, 2, '#ffb03a'); R(2, 10, 12, 2, '#8a8a82'); });
F('photowall', 3, 2, 'none', (R) => { R(0, 2, 48, 26, '#5a4a3a'); for (let i = 0; i < 8; i++) { const x = 3 + (i % 4) * 11, y = 5 + Math.floor(i / 4) * 11; R(x, y, 8, 8, '#e8e2d0'); R(x + 2, y + 2, 4, 4, '#8a8a82'); R(x + 1, y + 1, 1, 1, '#d23a3a'); } R(6, 10, 30, 1, '#d23a3a'); R(12, 14, 1, 10, '#d23a3a'); R(30, 9, 1, 12, '#d23a3a'); });
F('money', 1, 1, 'all', (R) => { R(1, 4, 14, 11, '#6b4426'); R(1, 4, 14, 2, '#8a5a32'); for (let i = 0; i < 4; i++) R(2 + (i % 2) * 6, 1 + Math.floor(i / 2) * 3, 6, 3, '#6aa86a'); });
F('phones', 1, 1, 'none', (R) => { R(1, 6, 14, 8, '#6b4426'); R(3, 2, 3, 6, '#222'); R(8, 3, 3, 5, '#222'); R(12, 1, 3, 6, '#333'); R(4, 3, 1, 2, '#5fb3d9'); });
F('weapon', 2, 1, 'all', (R) => { R(0, 4, 32, 10, '#3a2414'); R(0, 4, 32, 2, '#5a3a24'); R(4, 6, 24, 6, '#2b2f38'); R(8, 8, 14, 2, '#c0c6cc'); R(4, 8, 4, 2, '#3a2414'); });
F('coatrack', 1, 2, 'base', (R) => { R(7, 2, 2, 28, '#6b4426'); R(4, 29, 8, 2, '#6b4426'); R(3, 4, 10, 1, '#6b4426'); R(2, 5, 5, 10, '#5a6e9a'); R(9, 5, 4, 8, '#7a2f3a'); });
F('boxes', 1, 1, 'all', (R) => { R(1, 2, 14, 13, '#c9a06a'); R(1, 2, 14, 2, '#d9b07a'); R(7, 2, 2, 13, '#a8834f'); R(3, -6, 10, 8, '#b8905a'); R(3, -6, 10, 2, '#c9a06a'); });
F('washer', 1, 1, 'all', (R) => { R(1, -2, 14, 17, '#e8eef2'); R(1, -2, 14, 3, '#fff'); circ(R, 8, 7, 4, '#9aa6b2'); circ(R, 8, 7, 3, '#c0dfe8'); });
F('trophy', 2, 2, 'base', (R) => { R(0, 2, 32, 30, woodD); R(2, 4, 28, 26, '#4b2e1c'); R(2, 14, 28, 2, woodD); [[6, 6], [16, 7], [8, 18], [20, 18]].forEach(([x, y]) => { R(x, y, 6, 5, '#e8c35a'); R(x + 2, y + 5, 2, 3, '#c9a24a'); }); });

// İç mekânın statik katmanı
ART.renderInterior = function (m, def) {
  const W = m.w * TS, H = m.h * TS;
  const [c, g] = ART.canvas(W, H);
  const r = U.rng(U.hash(def.id || m.id, 'floor'));
  for (let y = 2; y < m.h; y++) for (let x = 0; x < m.w; x++) ART.floor(g, def.floor, def.floorColors, x * TS, y * TS, r, x, y);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 2 * TS, W, 4);
  const wall = def.wall;
  g.fillStyle = wall; g.fillRect(0, 0, W, 2 * TS);
  if (def.wallStripe) for (let x = 0; x < W; x += 8) { g.fillStyle = SH(wall, -0.07); g.fillRect(x, 0, 4, 2 * TS); }
  if (def.wallPattern === 'dots') for (let y = 3; y < 2 * TS - 8; y += 6) for (let x = (y % 12 ? 2 : 5); x < W; x += 6) { g.fillStyle = SH(wall, -0.1); g.fillRect(x, y, 1, 1); }
  if (def.wallPattern === 'brick') for (let y = 2; y < 2 * TS - 6; y += 4) { g.fillStyle = SH(wall, -0.12); g.fillRect(0, y, W, 1); for (let x = (y % 8 ? 0 : 4); x < W; x += 8) g.fillRect(x, y - 3, 1, 3); }
  if (def.wainscot) { g.fillStyle = def.wainscot; g.fillRect(0, 2 * TS - 12, W, 8); g.fillStyle = SH(def.wainscot, 0.2); g.fillRect(0, 2 * TS - 12, W, 1); }
  g.fillStyle = SH(wall, -0.25); g.fillRect(0, 2 * TS - 4, W, 4);
  g.fillStyle = SH(wall, 0.15); g.fillRect(0, 0, W, 2);
  g.fillStyle = def.edge || '#2b1d1a';
  g.fillRect(0, 0, 6, H); g.fillRect(W - 6, 0, 6, H); g.fillRect(0, H - 8, W, 8);
  const dx = m.door.x * TS;
  g.fillStyle = def.floorColors[0]; g.fillRect(dx, H - 16, 16, 16);
  g.fillStyle = '#7a3a2e'; g.fillRect(dx - 4, H - 12, 24, 10);
  g.fillStyle = '#9a4a3a'; g.fillRect(dx - 2, H - 10, 20, 6);
  const floorFirst = (f) => (/rug/.test(f.t) ? 0 : 1);
  const list = def.furniture.slice().sort((a, b) => (floorFirst(a) - floorFirst(b)) || ((a.y + FURN[a.t].h) - (b.y + FURN[b.t].h)));
  for (const f of list) {
    const cat = FURN[f.t];
    if (!cat) continue;
    const ox = f.x * TS, oy = f.y * TS;
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(ox + x, oy + y, w, h); };
    if (cat.solid !== 'none') { g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(ox + 2, oy + cat.h * TS - 3, cat.w * TS - 2, 4); }
    cat.draw(R, f.c);
  }
  return c;
};
