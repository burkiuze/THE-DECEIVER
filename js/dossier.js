'use strict';
// Dava dosyası: sekmeli pencere (Dava, Şüpheliler, Deliller, Görevler, Notlar, Harita, Kariyer).

const DOSSIER = { tab: 'case' };

DOSSIER.TABS = [
  ['case', 'Dava'], ['suspects', 'Şüpheliler'], ['evidence', 'Deliller'], ['tasks', 'Görevler'],
  ['notes', 'Notlar'], ['map', 'Harita'], ['career', 'Kariyer'],
];

DOSSIER.open = function (tab) {
  if (UI.busy() || G.scripting) return;
  if (tab) DOSSIER.tab = tab;
  let body;
  const m = UI.modal({
    title: 'Dava Dosyası', wide: true,
    onKey(k) {
      if (k === 'f' || k === 'F' || k === 'Tab') { m.close(); return true; }
      const i = DOSSIER.TABS.findIndex((t) => t[0] === DOSSIER.tab);
      if (k === 'ArrowRight') { DOSSIER.tab = DOSSIER.TABS[(i + 1) % DOSSIER.TABS.length][0]; render(); return true; }
      if (k === 'ArrowLeft') { DOSSIER.tab = DOSSIER.TABS[(i + DOSSIER.TABS.length - 1) % DOSSIER.TABS.length][0]; render(); return true; }
      return false;
    },
    build(b) { body = b; },
  });
  m.el.classList.add('dossier');
  const tabs = U.h('div', { class: 'tabs' });
  const content = U.h('div', { class: 'tab-content' });
  body.append(tabs, content);
  const render = () => {
    tabs.innerHTML = '';
    for (const [id, label] of DOSSIER.TABS) {
      tabs.appendChild(U.h('button', { class: 'tab' + (id === DOSSIER.tab ? ' on' : ''), onclick: () => { DOSSIER.tab = id; render(); } }, label));
    }
    content.innerHTML = '';
    content.scrollTop = 0;
    DOSSIER['tab_' + DOSSIER.tab](content, m);
  };
  render();
  return m;
};

function noCase(el) {
  el.appendChild(U.h('p', { class: 'muted' }, G.state.status === 'pending' ? 'Henüz brifing almadın. Şef Lena ile konuş.' : 'Şu an açık bir dava yok.'));
}

// ------------------------------------------------------------------ Dava
DOSSIER.tab_case = function (el) {
  const st = G.state, c = st.case, k = st.k;
  if (!c || st.status !== 'active') return noCase(el);
  el.appendChild(U.h('h3', null, `Dava #${c.num}: ${c.title}`));
  el.appendChild(U.h('p', null, `Kurban: `, U.h('b', null, c.victim.name), `, ${c.victim.job}. Ceset sabah 06.00’da ${c.finder} tarafından bulundu.`));
  el.appendChild(U.h('p', null, 'Olay yeri: ', U.h('b', null, G.place(c.scene).name), ` • Son gün: ${DATA.DAYS[(st.deadline - 1) % 7]} (Gün ${st.deadline}) gece yarısı`));
  const prof = U.h('table', { class: 'profile' });
  const row = (a, b) => prof.appendChild(U.h('tr', null, U.h('th', null, a), U.h('td', null, b)));
  const M = DATA.METHODS[c.method];
  row('Ölüm nedeni', k.autopsy ? M.label : '? (Adli Tıp)');
  row('Ölüm saati', k.autopsy ? `${U.hm(c.tod)} – ${U.hm(c.tod + 1)}` : '? (Adli Tıp)');
  row('Silah / yöntem', k.autopsy ? c.weapon : '?');
  el.appendChild(U.h('h3', null, 'Temel bilgiler'));
  el.appendChild(prof);

  el.appendChild(U.h('h3', null, 'Katilin profili'));
  el.appendChild(U.h('p', { class: 'muted small' }, 'Olay yerinden, otopsiden ve tanıklardan çıkan fiziksel izler. Bunları şüphelilerin özellikleriyle karşılaştır.'));
  const prof2 = U.h('table', { class: 'profile' });
  let any = false;
  for (const key of c.sceneAttrs) {
    let known = false;
    if (['shoe', 'smoke', 'hair', 'scent'].includes(key)) known = !!k.found[key];
    if (key === 'hand') known = k.autopsy;
    if (key === 'vehicle') known = k.neighbor;
    if (!known) continue;
    any = true;
    const v = c.culpritVals[key];
    prof2.appendChild(U.h('tr', null, U.h('th', null, DATA.ATTRS[key].label), U.h('td', { class: 'hl' }, key === 'hand' ? (v === 'sol' ? 'Solak' : 'Sağ elini kullanıyor') : DATA.ATTRS[key].fmt(v))));
  }
  if (any) el.appendChild(prof2);
  else el.appendChild(U.h('p', { class: 'muted' }, 'Henüz fiziksel iz bulunmadı. Olay yerine git, otopsiye bak, tanıklarla konuş.'));
};

// ------------------------------------------------------------------ Şüpheliler
DOSSIER.tab_suspects = function (el) {
  const st = G.state, c = st.case, k = st.k;
  if (!c || st.status !== 'active') return noCase(el);
  el.appendChild(U.h('p', { class: 'muted small' }, '“?” bilinmeyen bilgi. Gözlem (sorguda “onu oku”) el / sigara / koku; Grace’in geçmiş taraması ayakkabı / araç bilgisini verir. Elediğin şüphelinin kartını “Ele” ile işaretle.'));
  const grid = U.h('div', { class: 'sus-grid' });
  for (const s of c.suspects) {
    const ks = k.sus[s.id];
    const card = U.h('div', { class: 'sus-card' + (ks.out ? ' out' : '') });
    const pc = U.h('canvas', { width: 54, height: 54, class: 'pc' });
    ART.portrait(pc, s.spec);
    const toggle = U.h('button', { class: 'mini-btn', onclick: () => { ks.out = !ks.out; card.classList.toggle('out', ks.out); toggle.textContent = ks.out ? 'Geri al' : 'Ele'; G.save(); } }, ks.out ? 'Geri al' : 'Ele');
    card.appendChild(U.h('div', { class: 'sus-head' }, pc, U.h('div', null, U.h('div', { class: 'nm' }, s.name), U.h('div', { class: 'rel' }, `Kurbanın ${s.relation} • ${G.place(s.loc).short}`)), toggle));
    const t = U.h('table', { class: 'attrs' });
    const q = '?';
    const a = s.attrs;
    const cell = (label, known, v) => t.appendChild(U.h('tr', null, U.h('th', null, label), U.h('td', { class: known ? '' : 'unk' }, known ? v : q)));
    cell('Saç', true, a.hair);
    cell('El', ks.read, a.hand === 'sol' ? 'solak' : 'sağ');
    cell('Sigara', ks.read, a.smoke);
    cell('Koku', ks.read, a.scent);
    cell('Ayakkabı', ks.bg, a.shoe + ' no');
    cell('Araç', ks.bg, a.vehicle);
    card.appendChild(t);
    const info = U.h('div', { class: 'sus-info' });
    if (ks.motive) info.appendChild(U.h('p', null, U.h('b', null, 'İlişki: '), `“${DATA.MOTIVES[s.motive].say}”`));
    if (ks.alibi) info.appendChild(U.h('p', null, U.h('b', null, 'Mazeret: '), `“${s.alibi.claim}”`));
    if (ks.checked) info.appendChild(U.h('p', { class: s.alibi.ok ? 'ok' : 'bad' }, U.h('b', null, 'Tanık: '), `“${s.alibi.truth}”`));
    for (const hrd of ks.heard) info.appendChild(U.h('p', { class: 'gossip' }, U.h('b', null, 'Söylenti — '), hrd));
    const rd = k.evidence.find((e) => e.id === 'read_' + s.id);
    if (rd) info.appendChild(U.h('p', { class: 'secret' }, U.h('b', null, rd.title.split(':')[0] + ': '), rd.text));
    if (!ks.met) info.appendChild(U.h('p', { class: 'muted' }, 'Henüz konuşmadın.'));
    card.appendChild(info);
    grid.appendChild(card);
  }
  el.appendChild(grid);
};

// ------------------------------------------------------------------ Deliller
DOSSIER.tab_evidence = function (el, m) {
  const st = G.state, c = st.case, k = st.k;
  if (!c || st.status !== 'active') return noCase(el);
  const list = k.evidence.slice().reverse();
  if (!list.length) el.appendChild(U.h('p', { class: 'muted' }, 'Henüz delil yok.'));
  for (const e of list) {
    const item = U.h('div', { class: 'ev' }, U.h('div', { class: 'ev-t' }, e.title, U.h('span', { class: 'when' }, `Gün ${e.day} • ${U.fmt(e.time)}`)), U.h('div', { class: 'ev-x' }, e.text));
    if (e.id === 'clue_cipher' && !k.cipher) {
      item.appendChild(U.h('button', { class: 'mini-btn', onclick: async () => {
        m.close();
        G.scripting = true;
        try { await G.solveCipher(); } finally { G.scripting = false; G.save(); }
      } }, 'Şifreyi çöz'));
    }
    el.appendChild(item);
  }
};

// ------------------------------------------------------------------ Görevler
DOSSIER.tab_tasks = function (el) {
  const list = G.tasks();
  const ul = U.h('ul', { class: 'tasks' });
  for (const t of list) ul.appendChild(U.h('li', { class: t.done ? 'done' : '' }, U.h('span', { class: 'box' }, t.done ? '✓' : ''), U.h('span', null, t.t), U.h('span', { class: 'where' }, t.where)));
  el.appendChild(ul);
  const nt = list.find((t) => !t.done && t.hint);
  if (nt) el.appendChild(U.h('p', { class: 'muted' }, '💡 ' + nt.hint));
  el.appendChild(U.h('p', { class: 'muted small' }, 'Görevlerin hepsini yapmak zorunda değilsin; ama delil ne kadar çoksa yanılma ihtimalin o kadar az. Jade’in arabası (karakolun önünde) seni her yere 20 dakikada götürür.'));
};

// ------------------------------------------------------------------ Notlar
DOSSIER.tab_notes = function (el) {
  const k = G.state.k;
  if (!k) return noCase(el);
  el.appendChild(U.h('p', { class: 'muted small' }, 'Kendi notların. Mesela: “43 numara → Victor, Hazel...”'));
  const ta = U.h('textarea', { class: 'notes', placeholder: 'Düşüncelerini buraya yaz...' });
  ta.value = k.notes || '';
  ta.addEventListener('input', () => { k.notes = ta.value; });
  ta.addEventListener('blur', () => G.save());
  el.appendChild(ta);
};

// ------------------------------------------------------------------ Harita
DOSSIER.tab_map = function (el) {
  const tm = WORLD.maps.town;
  const scale = 0.5;
  const cv = U.h('canvas', { width: tm.w * TS * scale, height: tm.h * TS * scale, class: 'minimap' });
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(tm.ground, 0, 0, cv.width, cv.height);
  for (const o of tm.objects) if (o.kind === 'building' || o.kind === 'tree') g.drawImage(o.img, o.x * scale, o.y * scale, o.img.width * scale, o.img.height * scale);
  const c = G.state.case;
  g.font = 'bold 9px "Pixelify Sans", monospace';
  g.textAlign = 'center';
  for (const b of WORLD.BUILDINGS) {
    const x = (b.x + b.w / 2) * TS * scale, y = (b.y + b.h) * TS * scale + 8;
    let label = DATA.PLACES[b.id].short;
    if (c && G.active() && c.scene === b.id) label = '🚨 ' + label;
    if (c && G.active() && c.suspects.some((s) => s.loc === b.id)) label += ' 👤';
    const w = g.measureText(label).width + 6;
    g.fillStyle = 'rgba(43,29,26,0.85)'; g.fillRect(x - w / 2, y - 8, w, 11);
    g.fillStyle = '#f7ead0'; g.fillText(label, x, y);
  }
  if (G.map.kind === 'town') {
    g.fillStyle = '#ffd25a'; g.strokeStyle = '#2b1d1a';
    g.beginPath(); g.arc(G.player.x * scale, G.player.y * scale, 5, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  el.appendChild(U.h('div', { class: 'map-wrap' }, cv));
  el.appendChild(U.h('p', { class: 'muted small' }, '🚨 olay yeri • 👤 şüpheli • sarı nokta: sen (dışarıdayken)'));
};

// ------------------------------------------------------------------ Kariyer
DOSSIER.tab_career = function (el) {
  const st = G.state;
  const r = MINI.rank(st.rep);
  const next = DATA.RANKS.find((x) => x.rep > st.rep);
  const t = U.h('table', { class: 'profile' });
  const row = (a, b) => t.appendChild(U.h('tr', null, U.h('th', null, a), U.h('td', null, b)));
  row('Unvan', r.name);
  row('İtibar', `${st.rep}${next ? ` (sonraki unvan “${next.name}”: ${next.rep})` : ''}`);
  row('Çözülen / Başarısız', `${st.solved} / ${st.failed}`);
  row('Para', '$' + st.money);
  row('Maksimum odak', st.maxFocus);
  el.appendChild(t);
  el.appendChild(U.h('h3', null, 'Geçmiş davalar'));
  if (!st.history.length) el.appendChild(U.h('p', { class: 'muted' }, 'Henüz kapanan dava yok.'));
  for (const h of st.history.slice().reverse()) {
    el.appendChild(U.h('div', { class: 'ev' }, U.h('div', { class: 'ev-t' }, `#${h.num} ${h.title}`, U.h('span', { class: 'when' }, `${'★'.repeat(h.stars)}${'☆'.repeat(3 - h.stars)} ${h.result}`)), U.h('div', { class: 'ev-x' }, `Katil: ${h.culprit}`)));
  }
  el.appendChild(U.h('div', { class: 'mg-actions' }, U.h('button', { class: 'big alt', onclick: () => { SFX.muted = !SFX.muted; UI.toast(SFX.muted ? 'Ses kapalı' : 'Ses açık'); } }, 'Sesi aç/kapat (M)')));
};
