'use strict';
// Mini görevler: ceset arama, parmak izi, şifre, kasa, veritabanı, kişi seçici,
// sahte delil analizi, suçlama formu, unvanlar.

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
function portraitEl(spec, size, dead) {
  const c = U.h('canvas', { width: size || 48, height: size || 48, class: 'pc' });
  ART.portrait(c, spec, dead);
  return c;
}
MINI.portraitEl = portraitEl;

// ------------------------------------------------------------------ Ceset arama
MINI.bodySearch = function (sc) {
  const v = POP.get(sc.victim);
  const found = [];
  const m = UI.modal({
    title: 'Ceset: ' + v.name, wide: true,
    build(b) {
      const head = U.h('div', { class: 'body-head' }, portraitEl(v.spec, 72, true),
        U.h('div', null, U.h('div', { class: 'nm' }, `${v.name}, ${v.age}`), U.h('div', { class: 'muted' }, `${v.job} • ${G.place(sc.place).name}`),
          U.h('div', { class: 'muted small' }, sc.autopsy ? `Ölüm nedeni: ${DATA.METHODS[sc.method].label}` : 'Ölüm nedeni otopside belli olacak.')));
      b.appendChild(head);
      b.appendChild(U.h('p', { class: 'muted' }, 'Bir yeri seçerek ara. Bazı şeyler dikkatli bakmadan görünmez: “Dikkatle ara” 5 odak harcar.'));
      const grid = U.h('div', { class: 'pockets' });
      const render = () => {
        grid.innerHTML = '';
        for (const pk of DATA.POCKETS) {
          const items = sc.items.filter((it) => it.pocket === pk);
          const searched = sc.searched[pk];
          const card = U.h('div', { class: 'pocket' + (searched ? ' done' : '') });
          card.appendChild(U.h('div', { class: 'pk-t' }, pk));
          if (!searched) {
            card.appendChild(U.h('button', { class: 'mini-btn', onclick: () => {
              sc.searched[pk] = 1; G.advance(3); SFX.blip();
              for (const it of items) if (!it.hidden) { it.found = true; found.push(it); G.addEvidence(sc.caseId, 'item_' + sc.id + '_' + it.id, it.title, it.text, true); SFX.clue(); }
              render();
            } }, 'Ara'));
          } else {
            const vis = items.filter((it) => it.found);
            if (!vis.length) card.appendChild(U.h('div', { class: 'muted small' }, 'Boş.'));
            for (const it of vis) card.appendChild(U.h('div', { class: 'item' }, U.h('b', null, it.title + ': '), it.text));
            const hid = items.filter((it) => it.hidden && !it.found);
            if (searched === 1) {
              card.appendChild(U.h('button', { class: 'mini-btn alt', onclick: () => {
                if (!G.useFocus(5)) return;
                sc.searched[pk] = 2; G.advance(5); SFX.focus();
                if (!hid.length) UI.toast('Dikkatle baktın ama başka bir şey yok.');
                for (const it of hid) { it.found = true; found.push(it); G.addEvidence(sc.caseId, 'item_' + sc.id + '_' + it.id, it.title, it.text); SFX.clue(); }
                render();
              } }, 'Dikkatle ara (5 odak)'));
            }
          }
          grid.appendChild(card);
        }
      };
      render();
      b.appendChild(grid);
    },
  });
  return m.done.then(() => found);
};

// ------------------------------------------------------------------ Parmak izi
MINI.fingerprint = function (c) {
  const sel = new Set();
  const m = UI.modal({
    title: 'Parmak İzi Karşılaştırma', wide: true,
    build(b, mm) {
      b.appendChild(U.h('p', { class: 'muted' }, 'Kadehteki kısmi iz aşağıda. Bu 2×3 desen, hangi şüphelilerin kayıtlı izinde AYNEN (döndürmeden) geçiyor? Eşleşen herkesi seç.'));
      b.appendChild(U.h('div', { class: 'fp-partial' }, U.h('div', { class: 'lbl' }, 'Kısmi iz'), gridEl(c.print.partial, 'big')));
      const row = U.h('div', { class: 'fp-row' });
      for (const s of c.suspects) {
        const card = U.h('button', { class: 'fp-card' }, U.h('div', { class: 'fp-name' }, POP.get(s.pid).name), gridEl(c.print.grids[s.pid]));
        card.addEventListener('click', () => { if (sel.has(s.pid)) sel.delete(s.pid); else sel.add(s.pid); card.classList.toggle('on', sel.has(s.pid)); SFX.select(); });
        row.appendChild(card);
      }
      b.appendChild(row);
      const msg = U.h('div', { class: 'mg-msg' });
      const go = U.h('button', { class: 'big', onclick: () => {
        if (c.print.matches.slice().sort().join() === [...sel].sort().join()) { msg.textContent = 'Eşleşme doğrulandı!'; msg.className = 'mg-msg good'; setTimeout(() => mm.close(true), 600); }
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
  let shift = 0, out, val;
  const update = () => { out.textContent = CASES.caesar(c.cipher.text, -shift); val.textContent = shift; };
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
  let cells = [], cur = 0;
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
      for (const h of c.safe.hints) paper.appendChild(U.h('div', { class: 'hint' }, U.h('span', { class: 'code' }, h.g.join(' ')), U.h('span', null, CASES.hintText(h))));
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
          msg.textContent = new Set(digits).size < 3 ? 'Şifrede aynı rakam iki kez olamaz. (−5 odak)' : 'Kilit kıpırdamıyor. (−5 odak)';
          msg.className = 'mg-msg bad'; mm.el.classList.remove('shake'); void mm.el.offsetWidth; mm.el.classList.add('shake');
        }
      } }, 'Kasayı aç');
      b.append(U.h('p', { class: 'muted small' }, 'Rakam tuşları, ok tuşları ya da ▲▼ düğmeleri.'), msg, U.h('div', { class: 'mg-actions' }, go));
      draw();
    },
  });
  return m.done.then((r) => !!r);
};

// ------------------------------------------------------------------ Veritabanı
MINI.dbSearch = function () {
  const f = {};
  const m = UI.modal({
    title: 'Nüfus Veritabanı (Grace)', wide: true,
    build(b) {
      b.appendChild(U.h('p', { class: 'muted' }, 'Kayıtlarda yalnızca cinsiyet, yaş, saç rengi, ayakkabı numarası, kayıtlı araç ve iş yeri var. El, sigara ve koku için insanları kendin okumalısın. Her arama 15 dakika sürer.'));
      const sel = (key, label, opts) => {
        const s = U.h('select', { id: 'db-' + key }, U.h('option', { value: '' }, '— hepsi —'), ...opts.map(([v, l]) => U.h('option', { value: v }, l)));
        s.addEventListener('change', () => { f[key] = s.value || null; });
        return U.h('label', { class: 'dbf' }, U.h('span', null, label), s);
      };
      const work = Object.keys(DATA.WORKPLACES).concat(['fbi', 'cityhall']).filter((v, i, a) => a.indexOf(v) === i);
      const form = U.h('div', { class: 'dbform' },
        sel('g', 'Cinsiyet', [['f', 'Kadın'], ['m', 'Erkek']]),
        sel('hair', 'Saç', DATA.ATTRS.hair.values.map((v) => [v, v])),
        sel('shoe', 'Ayakkabı', [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46].map((v) => [v, v + ' no'])),
        sel('vehicle', 'Araç', DATA.ATTRS.vehicle.values.concat(['aracı yok']).map((v) => [v, v])),
        sel('ageMin', 'Yaş en az', [20, 30, 40, 50, 60, 70].map((v) => [v, v])),
        sel('ageMax', 'Yaş en çok', [30, 40, 50, 60, 70, 90].map((v) => [v, v])),
        sel('work', 'İş yeri', work.map((v) => [v, G.place(v).short])));
      b.appendChild(form);
      const out = U.h('div', { class: 'dbout' });
      const go = U.h('button', { class: 'big', onclick: () => {
        G.advance(15);
        const res = POP.search(f);
        out.innerHTML = '';
        if (res.length > 12) { out.appendChild(U.h('p', { class: 'mg-msg bad' }, `${res.length} kişi eşleşti. Çok fazla; filtreleri daralt.`)); return; }
        if (!res.length) { out.appendChild(U.h('p', { class: 'mg-msg bad' }, 'Eşleşen kimse yok.')); return; }
        out.appendChild(U.h('p', { class: 'mg-msg good' }, `${res.length} kişi eşleşti:`));
        for (const p of res) out.appendChild(MINI.personRow(p));
        G.addEvidence('people', 'db_' + Date.now(), 'Veritabanı araması', `Filtre: ${Object.entries(f).filter(([, v]) => v).map(([k, v]) => k + '=' + v).join(', ') || 'yok'} → ${res.map((p) => p.name).join(', ')}`, true);
      } }, 'Ara');
      b.append(U.h('div', { class: 'mg-actions' }, go), out);
    },
  });
  return m.done;
};

MINI.personRow = function (p, onPick) {
  const kn = G.know(p.id);
  const a = p.attrs;
  const facts = [`${p.age}, ${p.job}`, `saç: ${a.hair}`];
  if (kn.bg) facts.push(`ayakkabı ${a.shoe}`, a.vehicle);
  if (kn.read) facts.push(a.hand === 'sol' ? 'solak' : 'sağ el', a.smoke, a.scent);
  const where = POP.placeName(POP.where(p, G.state.day, G.state.time));
  const row = U.h('div', { class: 'prow' + (onPick ? ' pick' : '') }, portraitEl(p.spec, 40, !p.alive),
    U.h('div', { class: 'pinfo' }, U.h('div', { class: 'nm' }, p.name + (p.jailed ? ' (gözaltı)' : '') + (!p.alive ? ' (ölü)' : '')), U.h('div', { class: 'small' }, facts.join(' • ')), U.h('div', { class: 'small muted' }, 'Şu an: ' + where + ' • Ev: ' + G.place(p.home).name)));
  if (onPick) row.addEventListener('click', () => onPick(p));
  return row;
};

// ------------------------------------------------------------------ Kişi seçici
MINI.personPicker = function (title, desc, onlyIds) {
  const m = UI.modal({
    title, wide: true,
    build(b, mm) {
      b.appendChild(U.h('p', { class: 'muted' }, desc));
      const q = U.h('input', { id: 'pp-q', class: 'search', placeholder: 'İsim, meslek ya da özellik yaz (ör. kızıl, 43, solak)...' });
      const list = U.h('div', { class: 'plist' });
      const base = (onlyIds ? onlyIds.map((id) => POP.get(id)) : POP.people).filter((p) => p.alive && !p.gone);
      const render = () => {
        const t = q.value.toLowerCase().trim();
        list.innerHTML = '';
        const res = base.filter((p) => {
          if (!t) return onlyIds || G.know(p.id).met;
          const kn = G.know(p.id);
          const hay = [p.name, p.job, p.attrs.hair, kn.bg ? p.attrs.shoe + ' ' + p.attrs.vehicle : '', kn.read ? (p.attrs.hand === 'sol' ? 'solak' : '') + ' ' + p.attrs.smoke + ' ' + p.attrs.scent : ''].join(' ').toLowerCase();
          return t.split(/\s+/).every((w) => hay.includes(w));
        }).slice(0, 30);
        if (!res.length) list.appendChild(U.h('p', { class: 'muted' }, t ? 'Eşleşen yok.' : 'Tanıştığın kimse yok. İsim yazarak ara.'));
        for (const p of res) list.appendChild(MINI.personRow(p, (pp) => { mm.close(pp.id); }));
      };
      q.addEventListener('input', render);
      b.append(q, list);
      render();
      setTimeout(() => q.focus(), 50);
    },
  });
  return m.done.then((r) => r || null);
};

// ------------------------------------------------------------------ Sahte delil analizi
MINI.frameAnalysis = function (fdef) {
  const m = UI.modal({
    title: 'Sahte Delil: ' + fdef.title, wide: true,
    build(b, mm) {
      b.appendChild(U.h('p', null, fdef.text));
      b.appendChild(U.h('p', { class: 'muted' }, 'Aşağıdaki gözlemlerden biri, delilin oraya BİLEREK yerleştirildiğini gösteriyor. Hangisi?'));
      const msg = U.h('div', { class: 'mg-msg' });
      const r = U.rng(U.hash(fdef.id, G.state.day));
      for (const f of r.shuffle(fdef.facts)) {
        b.appendChild(U.h('button', { class: 'opt wide', onclick: () => {
          if (f.fake) { SFX.good(); msg.textContent = 'İşte bu! Delil kurgulanmış.'; msg.className = 'mg-msg good'; setTimeout(() => mm.close(true), 700); }
          else { G.state.focus = Math.max(0, G.state.focus - 8); G.state.story.suspicion = Math.min(100, G.state.story.suspicion + 5); SFX.bad(); msg.textContent = 'Bu bir şey kanıtlamıyor; aksine seni daha da şüpheli gösteriyor. (−8 odak, şüphe +5)'; msg.className = 'mg-msg bad'; }
        } }, f.t));
      }
      b.appendChild(msg);
    },
  });
  return m.done.then((r) => !!r);
};

// ------------------------------------------------------------------ Suçlama (sıradan dava)
MINI.accuse = function (c) {
  const pick = { suspect: null, method: null, motive: null };
  const m = UI.modal({
    title: 'Suçlama', wide: true,
    build(b, mm) {
      b.appendChild(U.h('p', { class: 'muted' }, 'Katili, öldürme yöntemini ve motifini seç. Katili doğru bulmak şart; yöntem ve motif yıldız kazandırır. Yanlış kişiyi suçlarsan itibar kaybedersin; iki yanlışta davadan alınırsın.'));
      const row = U.h('div', { class: 'acc-row' });
      const cards = [];
      for (const s of c.suspects) {
        const p = POP.get(s.pid);
        const card = U.h('button', { class: 'acc-card' + (c.k.sus[s.pid].out ? ' out' : '') }, portraitEl(p.spec, 54), U.h('div', { class: 'nm' }, p.name), U.h('div', { class: 'rel' }, s.relation));
        card.addEventListener('click', () => { pick.suspect = s.pid; cards.forEach((x) => x.classList.toggle('on', x === card)); SFX.select(); });
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

// ------------------------------------------------------------------ Unvan
MINI.rank = function (rep) {
  let r = DATA.RANKS[0];
  for (const x of DATA.RANKS) if (rep >= x.rep) r = x;
  return r;
};
MINI.rankCheck = async function () {
  const st = G.state;
  const r = MINI.rank(st.rep);
  if (st.rankName && st.rankName !== r.name) {
    SFX.good();
    await UI.say(null, `Yeni unvan: “${r.name}”! Kasabada adın konuşulmaya başladı.`);
  }
  st.rankName = r.name;
};
