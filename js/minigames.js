'use strict';
// Mini görevler: parmak izi, şifre çözme, kasa kilidi, suçlama formu, rütbe.

const MINI = {};

const GLYPHS = [
  '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="2.4" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 10 10"><path d="M5 1.6 L8.6 8.2 L1.4 8.2 Z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  '<svg viewBox="0 0 10 10"><path d="M1.5 8 Q5 0 8.5 8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
];

function gridEl(grid, cls) {
  const el = U.h('div', { class: 'fp-grid ' + (cls || ''), style: `grid-template-columns:repeat(${grid[0].length},1fr)` });
  for (const row of grid) for (const v of row) el.appendChild(U.h('span', { class: 'g g' + v, html: GLYPHS[v] }));
  return el;
}

function portraitEl(spec, size) {
  const c = U.h('canvas', { width: size || 48, height: size || 48, class: 'pc' });
  ART.portrait(c, spec);
  return c;
}

// ------------------------------------------------------------------ Parmak izi
MINI.fingerprint = function (c) {
  const sel = new Set();
  const m = UI.modal({
    title: 'Parmak İzi Karşılaştırma', wide: true,
    build(b, mm) {
      b.appendChild(U.h('p', { class: 'muted' }, 'Kadehteki kısmi iz aşağıda. Bu 2×3 desen, hangi şüphelilerin kayıtlı izinde AYNEN (döndürmeden) geçiyor? Eşleşen herkesi seç.'));
      const top = U.h('div', { class: 'fp-partial' }, U.h('div', { class: 'lbl' }, 'Kısmi iz'), gridEl(c.print.partial, 'big'));
      b.appendChild(top);
      const row = U.h('div', { class: 'fp-row' });
      for (const s of c.suspects) {
        const card = U.h('button', { class: 'fp-card' },
          U.h('div', { class: 'fp-name' }, s.name), gridEl(c.print.grids[s.id]));
        card.addEventListener('click', () => { if (sel.has(s.id)) sel.delete(s.id); else sel.add(s.id); card.classList.toggle('on', sel.has(s.id)); SFX.select(); });
        row.appendChild(card);
      }
      b.appendChild(row);
      const msg = U.h('div', { class: 'mg-msg' });
      const go = U.h('button', { class: 'big', onclick: () => {
        const want = c.print.matches.slice().sort().join(',');
        const got = [...sel].sort().join(',');
        if (want === got) { msg.textContent = 'Eşleşme doğrulandı!'; msg.className = 'mg-msg good'; setTimeout(() => mm.close(true), 600); }
        else {
          G.state.focus = Math.max(0, G.state.focus - 8); SFX.bad();
          msg.textContent = sel.size === 0 ? 'En az bir kişi seçmelisin.' : 'Bu eşleşme tutmuyor. Desenin TAMAMI aynı sırada görünmeli. (−8 odak)';
          msg.className = 'mg-msg bad'; mm.el.classList.remove('shake'); void mm.el.offsetWidth; mm.el.classList.add('shake');
        }
      } }, 'Karşılaştır');
      b.append(msg, U.h('div', { class: 'mg-actions' }, go));
    },
  });
  return m.done.then((r) => !!r);
};

// ------------------------------------------------------------------ Şifre çözme
MINI.cipher = function (c) {
  let shift = 0;
  let out, val;
  const update = () => { out.textContent = CASEGEN.caesar(c.cipher.text, -shift); val.textContent = shift; };
  const m = UI.modal({
    title: 'Şifreli Not', wide: true,
    onKey(k) {
      if (k === 'ArrowLeft' || k === 'a') { shift = (shift + 25) % 26; update(); return true; }
      if (k === 'ArrowRight' || k === 'd') { shift = (shift + 1) % 26; update(); return true; }
      return false;
    },
    build(b, mm) {
      b.appendChild(U.h('p', { class: 'muted' }, 'Her harf alfabede aynı miktarda kaydırılmış (Sezar şifresi). Kaydırma miktarını bul; metin anlamlı Türkçe olduğunda onayla. Rakamlar şifrelenmemiş.'));
      b.appendChild(U.h('div', { class: 'note-paper' }, c.cipher.text));
      val = U.h('span', { class: 'shift-val' }, '0');
      const minus = U.h('button', { class: 'sq', onclick: () => { shift = (shift + 25) % 26; update(); SFX.blip(); } }, '◀');
      const plus = U.h('button', { class: 'sq', onclick: () => { shift = (shift + 1) % 26; update(); SFX.blip(); } }, '▶');
      b.appendChild(U.h('div', { class: 'shift-row' }, U.h('span', null, 'Geri kaydırma:'), minus, val, plus));
      out = U.h('div', { class: 'note-paper decoded' });
      b.appendChild(out);
      const msg = U.h('div', { class: 'mg-msg' });
      const go = U.h('button', { class: 'big', onclick: () => {
        if (shift === c.cipher.shift) { msg.textContent = 'Not çözüldü!'; msg.className = 'mg-msg good'; setTimeout(() => mm.close(true), 600); }
        else { G.state.focus = Math.max(0, G.state.focus - 5); SFX.bad(); msg.textContent = 'Bu hâlâ anlamsız. (−5 odak) İpucu: BU, GECE, SAAT gibi kısa kelimeleri ara.'; msg.className = 'mg-msg bad'; }
      } }, 'Bu anlamlı!');
      b.append(msg, U.h('div', { class: 'mg-actions' }, go));
      update();
    },
  });
  return m.done.then((r) => !!r);
};

// ------------------------------------------------------------------ Kasa kilidi
MINI.safe = function (c) {
  const digits = [0, 0, 0];
  let cells = [];
  let cur = 0;
  const draw = () => cells.forEach((el, i) => { el.textContent = digits[i]; el.classList.toggle('cur', i === cur); });
  const m = UI.modal({
    title: 'Kurbanın Kasası', wide: true,
    onKey(k) {
      if (/^[0-9]$/.test(k)) { digits[cur] = +k; cur = (cur + 1) % 3; draw(); SFX.blip(); return true; }
      if (k === 'ArrowLeft') { cur = (cur + 2) % 3; draw(); return true; }
      if (k === 'ArrowRight') { cur = (cur + 1) % 3; draw(); return true; }
      if (k === 'ArrowUp') { digits[cur] = (digits[cur] + 1) % 10; draw(); return true; }
      if (k === 'ArrowDown') { digits[cur] = (digits[cur] + 9) % 10; draw(); return true; }
      return false;
    },
    build(b, mm) {
      b.appendChild(U.h('p', { class: 'muted' }, 'Kurban kasanın 3 haneli şifresini unutmamak için bu ipuçlarını yazmış. Şifrede her rakam yalnızca bir kez geçiyor. İpuçlarını birlikte düşünerek tek olası şifreyi bul.'));
      const paper = U.h('div', { class: 'note-paper hints' });
      for (const h of c.safe.hints) {
        paper.appendChild(U.h('div', { class: 'hint' }, U.h('span', { class: 'code' }, h.g.join(' ')), U.h('span', null, CASEGEN.hintText(h))));
      }
      b.appendChild(paper);
      const dial = U.h('div', { class: 'safe-dial' });
      cells = [0, 1, 2].map((i) => {
        const cell = U.h('div', { class: 'digit', onclick: () => { cur = i; draw(); } }, '0');
        const up = U.h('button', { class: 'sq', onclick: () => { digits[i] = (digits[i] + 1) % 10; cur = i; draw(); SFX.blip(); } }, '▲');
        const dn = U.h('button', { class: 'sq', onclick: () => { digits[i] = (digits[i] + 9) % 10; cur = i; draw(); SFX.blip(); } }, '▼');
        dial.appendChild(U.h('div', { class: 'dcol' }, up, cell, dn));
        return cell;
      });
      b.appendChild(dial);
      const msg = U.h('div', { class: 'mg-msg' });
      const go = U.h('button', { class: 'big', onclick: () => {
        if (digits.join('') === c.safe.code.join('')) { msg.textContent = 'Klik!'; msg.className = 'mg-msg good'; SFX.good(); setTimeout(() => mm.close(true), 500); }
        else {
          G.state.focus = Math.max(0, G.state.focus - 5); SFX.bad();
          const dup = new Set(digits).size < 3;
          msg.textContent = dup ? 'Şifrede aynı rakam iki kez olamaz. (−5 odak)' : 'Kilit kıpırdamıyor. (−5 odak)';
          msg.className = 'mg-msg bad'; mm.el.classList.remove('shake'); void mm.el.offsetWidth; mm.el.classList.add('shake');
        }
      } }, 'Kasayı aç');
      b.append(U.h('p', { class: 'muted small' }, 'Rakam tuşları, ok tuşları ya da ▲▼ düğmeleri.'), msg, U.h('div', { class: 'mg-actions' }, go));
      draw();
    },
  });
  return m.done.then((r) => !!r);
};

// ------------------------------------------------------------------ Suçlama
MINI.accuse = function (c, k) {
  const pick = { suspect: null, method: null, motive: null };
  const m = UI.modal({
    title: 'Suçlama', wide: true,
    build(b, mm) {
      b.appendChild(U.h('p', { class: 'muted' }, 'Katili, öldürme yöntemini ve motifini seç. Katili doğru bulmak şart; yöntem ve motif yıldız kazandırır. Yanlış kişiyi suçlarsan itibar kaybedersin; iki yanlışta davadan alınırsın.'));
      const row = U.h('div', { class: 'acc-row' });
      const cards = [];
      for (const s of c.suspects) {
        const ks = k.sus[s.id];
        const card = U.h('button', { class: 'acc-card' + (ks.out ? ' out' : '') }, portraitEl(s.spec, 54), U.h('div', { class: 'nm' }, s.name), U.h('div', { class: 'rel' }, s.relation));
        card.addEventListener('click', () => { pick.suspect = s.id; cards.forEach((x) => x.classList.toggle('on', x === card)); SFX.select(); });
        cards.push(card); row.appendChild(card);
      }
      b.appendChild(U.h('h3', null, '1. Katil kim?'));
      b.appendChild(row);
      const mk = (title, keys, obj, field) => {
        const wrap = U.h('div', { class: 'acc-opts' });
        const btns = keys.map((key) => {
          const bt = U.h('button', { class: 'opt' }, obj[key].label);
          bt.addEventListener('click', () => { pick[field] = key; btns.forEach((x) => x.classList.toggle('on', x === bt)); SFX.select(); });
          return bt;
        });
        btns.forEach((x) => wrap.appendChild(x));
        b.appendChild(U.h('h3', null, title));
        b.appendChild(wrap);
      };
      mk('2. Nasıl öldürdü?', DATA.METHOD_KEYS, DATA.METHODS, 'method');
      mk('3. Neden? (Motif)', DATA.MOTIVE_KEYS, DATA.MOTIVES, 'motive');
      const msg = U.h('div', { class: 'mg-msg' });
      const go = U.h('button', { class: 'big danger', onclick: () => {
        if (!pick.suspect || !pick.method || !pick.motive) { msg.textContent = 'Üç soruyu da yanıtla.'; msg.className = 'mg-msg bad'; return; }
        mm.close(Object.assign({}, pick));
      } }, 'Suçla!');
      const cancel = U.h('button', { class: 'big alt', onclick: () => mm.close(null) }, 'Vazgeç');
      b.append(msg, U.h('div', { class: 'mg-actions' }, cancel, go));
    },
  });
  return m.done.then((r) => r || null);
};

// ------------------------------------------------------------------ Rütbe
MINI.rank = function (rep) {
  let r = DATA.RANKS[0];
  for (const x of DATA.RANKS) if (rep >= x.rep) r = x;
  return r;
};
MINI.rankCheck = async function () {
  const st = G.state;
  const r = MINI.rank(st.rep);
  if (st.rankName && st.rankName !== r.name && st.rep >= r.rep) {
    SFX.good();
    await UI.say(null, `Yeni unvan: “${r.name}”! Kasabada adın konuşulmaya başladı.`);
  }
  st.rankName = r.name;
};
