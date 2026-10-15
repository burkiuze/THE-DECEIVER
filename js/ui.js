'use strict';
// Arayüz: diyalog kutusu (yazı makinesi efekti + seçenekler), bildirimler, pencereler, ses.

const UI = { dlg: null, modals: [] };

// ---------------------------------------------------------------- Ses efektleri
const SFX = {
  ctx: null, muted: false,
  ensure() {
    if (this.ctx || this.muted) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.muted = true; }
  },
  tone(freq, dur, type, vol, delay) {
    if (this.muted) return;
    this.ensure();
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol || 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  blip() { this.tone(520 + Math.random() * 80, 0.04, 'square', 0.015); },
  select() { this.tone(660, 0.06, 'square', 0.03); },
  clue() { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, i * 0.08)); },
  good() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.06, i * 0.1)); },
  bad() { [330, 247].forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.04, i * 0.15)); },
  door() { this.tone(180, 0.08, 'triangle', 0.06); this.tone(140, 0.1, 'triangle', 0.05, 0.06); },
  focus() { [400, 600, 900].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.05, i * 0.06)); },
};

// ---------------------------------------------------------------- Diyalog
UI.init = function () {
  UI.$dialog = document.getElementById('dialog');
  UI.$portrait = document.getElementById('dlg-portrait');
  UI.$name = document.getElementById('dlg-name');
  UI.$text = document.getElementById('dlg-text');
  UI.$choices = document.getElementById('dlg-choices');
  UI.$next = document.getElementById('dlg-next');
  UI.$modal = document.getElementById('modal');
  UI.$toasts = document.getElementById('toasts');
  UI.$dialog.addEventListener('click', (e) => {
    if (e.target.closest('.choice')) return;
    UI.advance();
  });
  requestAnimationFrame(UI.tick);
};

UI.busy = () => !!UI.dlg || UI.modals.length > 0;

UI.say = function (who, text) {
  return new Promise((res) => { UI.dlg = { type: 'say', who, text, res, shown: 0, acc: 0 }; UI.renderDlg(); });
};

UI.choose = function (who, text, options) {
  return new Promise((res) => { UI.dlg = { type: 'choose', who, text, options, res, sel: 0, shown: 0, acc: 0 }; UI.renderDlg(); });
};

// Birden fazla satırı art arda söyler
UI.lines = async function (who, arr) { for (const t of arr) await UI.say(who, t); };

UI.renderDlg = function () {
  const d = UI.dlg;
  document.body.classList.toggle('dlg-open', !!d);
  if (!d) { UI.$dialog.classList.add('hidden'); return; }
  UI.$dialog.classList.remove('hidden');
  const who = d.who;
  if (who && who.spec) { UI.$portrait.style.display = ''; ART.portrait(UI.$portrait, who.spec); }
  else UI.$portrait.style.display = 'none';
  UI.$name.textContent = who ? who.name : '';
  UI.$name.style.display = who ? '' : 'none';
  UI.$dialog.classList.toggle('narration', !who);
  UI.$text.textContent = d.text.slice(0, d.shown);
  UI.$choices.innerHTML = '';
  const done = d.shown >= d.text.length;
  UI.$next.style.visibility = done && d.type === 'say' ? 'visible' : 'hidden';
  if (d.type === 'choose' && done) {
    d.options.forEach((opt, i) => {
      const label = typeof opt === 'string' ? opt : opt.label;
      const disabled = typeof opt === 'object' && opt.disabled;
      const b = U.h('button', { class: 'choice' + (i === d.sel ? ' sel' : '') + (disabled ? ' dis' : ''), onclick: (e) => { e.stopPropagation(); if (!disabled) UI.pick(i); } },
        U.h('span', { class: 'num' }, String(i + 1)), label);
      b.addEventListener('mouseenter', () => { if (d.sel !== i) { d.sel = i; UI.renderDlg(); } });
      UI.$choices.appendChild(b);
    });
  }
};

UI.tick = function (t) {
  const d = UI.dlg;
  if (d && d.shown < d.text.length) {
    d.acc += 1.6;
    const n = Math.floor(d.acc);
    if (n > 0) {
      d.acc -= n;
      d.shown = Math.min(d.text.length, d.shown + n);
      if (d.shown % 4 === 0) SFX.blip();
      UI.renderDlg();
    }
  }
  requestAnimationFrame(UI.tick);
};

UI.advance = function () {
  const d = UI.dlg;
  if (!d) return;
  if (d.shown < d.text.length) { d.shown = d.text.length; UI.renderDlg(); return; }
  if (d.type === 'say') { UI.dlg = null; UI.renderDlg(); d.res(); }
  else UI.pick(d.sel);
};

UI.pick = function (i) {
  const d = UI.dlg;
  if (!d || d.type !== 'choose') return;
  const opt = d.options[i];
  if (!opt || (typeof opt === 'object' && opt.disabled)) return;
  SFX.select();
  UI.dlg = null; UI.renderDlg(); d.res(i);
};

UI.key = function (k) {
  // Önce en üstteki pencere
  if (UI.modals.length) {
    const top = UI.modals[UI.modals.length - 1];
    if (top.onKey && top.onKey(k)) return true;
    if (k === 'Escape' && top.closable !== false) { top.close(); return true; }
    return true;
  }
  const d = UI.dlg;
  if (!d) return false;
  if (k === 'e' || k === 'E' || k === ' ' || k === 'Enter') { UI.advance(); return true; }
  if (d.type === 'choose' && d.shown >= d.text.length) {
    const n = d.options.length;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { d.sel = (d.sel - 1 + n) % n; UI.renderDlg(); }
    if (k === 'ArrowDown' || k === 's' || k === 'S') { d.sel = (d.sel + 1) % n; UI.renderDlg(); }
    if (/^[1-9]$/.test(k) && +k <= n) UI.pick(+k - 1);
  }
  return true;
};

// ---------------------------------------------------------------- Bildirimler
UI.toast = function (msg, kind) {
  const el = U.h('div', { class: 'toast ' + (kind || '') }, msg);
  UI.$toasts.appendChild(el);
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3800);
};

// ---------------------------------------------------------------- Pencereler
// UI.modal({title, body(el), wide, closable, onKey}) -> {close, el, done(Promise)}
UI.modal = function (opts) {
  const wrap = U.h('div', { class: 'modal-wrap' });
  const box = U.h('div', { class: 'panel modal-box' + (opts.wide ? ' wide' : '') });
  const head = U.h('div', { class: 'modal-head' }, U.h('h2', null, opts.title || ''));
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const m = {
    el: box, closable: opts.closable, onKey: opts.onKey, result: undefined,
    close(result) {
      if (m.closed) return;
      m.closed = true;
      if (result !== undefined) m.result = result;
      wrap.remove();
      UI.modals.splice(UI.modals.indexOf(m), 1);
      if (!UI.modals.length) UI.$modal.classList.add('hidden');
      resolve(m.result);
    },
    done,
  };
  if (opts.closable !== false) head.appendChild(U.h('button', { class: 'xbtn', onclick: () => m.close() }, '✕'));
  const body = U.h('div', { class: 'modal-body' });
  box.append(head, body);
  wrap.appendChild(box);
  UI.$modal.appendChild(wrap);
  UI.$modal.classList.remove('hidden');
  UI.modals.push(m);
  m.body = body;
  if (opts.build) opts.build(body, m);
  return m;
};

// ---------------------------------------------------------------- HUD
UI.hudCache = {};
UI.setHud = function (id, val, prop) {
  if (UI.hudCache[id] === val) return;
  UI.hudCache[id] = val;
  const el = document.getElementById(id);
  if (!el) return;
  if (prop === 'width') el.style.width = val;
  else el.textContent = val;
};
