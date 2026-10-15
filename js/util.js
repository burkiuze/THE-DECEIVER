'use strict';
// Genel yardımcılar: tohumlu rastgele sayı üreteci, zaman biçimleme, DOM kısayolları.

const U = {};

U.rng = function (seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
  };
  return r;
};

U.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Dakikayı "HH:MM" biçimine çevirir (gece yarısını geçen değerler için mod 24 saat).
U.fmt = function (min) {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

// Saat (ondalıklı olabilir) -> "21.30" gibi metin.
U.hm = function (hours) {
  const total = Math.round(hours * 60);
  const h = ((Math.floor(total / 60) % 24) + 24) % 24;
  const m = ((total % 60) + 60) % 60;
  return String(h).padStart(2, '0') + '.' + String(m).padStart(2, '0');
};

U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Küçük DOM oluşturucu: U.h('div', {class:'x', onclick:fn}, 'metin', çocukEleman)
U.h = function (tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  return el;
};

U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Deterministik karma: aynı girdiler her zaman aynı 32-bit sayıyı verir (programlar, olaylar için).
U.hash = function (...nums) {
  let h = 2166136261 >>> 0;
  for (const n of nums) {
    const s = typeof n === 'string' ? n : String(n);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= 0x9e3779b9; h = Math.imul(h, 2246822507) >>> 0;
  }
  h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0; h ^= h >>> 16;
  return h >>> 0;
};
U.hrand = (...nums) => U.hash(...nums) / 4294967296;
U.hpick = (arr, ...nums) => arr[U.hash(...nums) % arr.length];
U.weighted = function (pairs, r) {
  let tot = 0;
  for (const [, w] of pairs) tot += w;
  let x = r * tot;
  for (const [v, w] of pairs) { if ((x -= w) < 0) return v; }
  return pairs[pairs.length - 1][0];
};
