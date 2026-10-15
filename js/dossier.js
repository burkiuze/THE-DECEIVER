'use strict';
// Dava dosyası: sekmeli pencere.

const DOSSIER = { tab: 'case' };

DOSSIER.TABS = [
  ['case', 'Dava'], ['suspects', 'Şüpheliler'], ['evidence', 'Deliller'], ['serial', 'Seri Katil'], ['net', 'Lion Lion'],
  ['people', 'Kişiler'], ['tasks', 'Görevler'], ['notes', 'Notlar'], ['map', 'Harita'], ['career', 'Kariyer'],
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
      if (id === 'net' && !G.state.story.codeKnown) continue;
      if (id === 'serial' && !G.state.serial) continue;
      tabs.appendChild(U.h('button', { class: 'tab' + (id === DOSSIER.tab ? ' on' : ''), onclick: () => { DOSSIER.tab = id; render(); } }, label));
    }
    content.innerHTML = '';
    content.scrollTop = 0;
    (DOSSIER['tab_' + DOSSIER.tab] || DOSSIER.tab_case)(content, m);
  };
  render();
  return m;
};

const H = U.h;
function table(rows) {
  const t = H('table', { class: 'profile' });
  for (const [a, b, cls] of rows) t.appendChild(H('tr', null, H('th', null, a), H('td', { class: cls || '' }, b)));
  return t;
}

// ------------------------------------------------------------------ Dava
DOSSIER.tab_case = function (el) {
  const st = G.state, c = G.curCase();
  if (!c || c.status !== 'active') { el.appendChild(H('p', { class: 'muted' }, c && c.status === 'pending' ? 'Şef Lena ile konuşup brifing al.' : 'Şu an açık bir sıradan dava yok.')); return; }
  const sc = st.scenes[c.sceneId];
  const v = POP.get(c.victim);
  el.appendChild(H('h3', null, `Dava #${c.num}: ${c.title}`));
  el.appendChild(H('div', { class: 'body-head' }, MINI.portraitEl(v.spec, 64, true), H('div', null, H('div', { class: 'nm' }, v.name), H('div', { class: 'muted' }, `${v.age} yaşında, ${v.job}`), H('div', null, 'Olay yeri: ', H('b', null, G.place(sc.place).name)), H('div', { class: 'small' }, `Son gün: ${DATA.DAYS[(c.deadline - 1) % 7]} (Gün ${c.deadline}) gece yarısı`))));
  const M = DATA.METHODS[c.method];
  el.appendChild(H('h3', null, 'Temel bilgiler'));
  el.appendChild(table([
    ['Ölüm nedeni', sc.autopsy ? M.label : '? (Adli Tıp)'],
    ['Ölüm saati', sc.autopsy ? `${U.hm(c.tod)} – ${U.hm(c.tod + 1)}` : '? (Adli Tıp)'],
    ['Silah / yöntem', sc.autopsy ? c.weapon : '?'],
  ]));
  el.appendChild(H('h3', null, 'Katilin profili'));
  el.appendChild(H('p', { class: 'muted small' }, 'Olay yerinden, otopsiden ve tanıklardan çıkan izler. Şüphelilerin özellikleriyle karşılaştır.'));
  const rows = [];
  for (const key of c.sceneAttrs) {
    let known = false;
    if (['shoe', 'smoke', 'hair', 'scent'].includes(key)) known = !!sc.found[key];
    if (key === 'hand') known = sc.autopsy;
    if (key === 'vehicle') known = !!c.k.witness;
    if (!known) continue;
    const val = c.culpritVals[key];
    rows.push([DATA.ATTRS[key].label, key === 'hand' ? (val === 'sol' ? 'Solak' : 'Sağ elini kullanıyor') : DATA.ATTRS[key].fmt(val), 'hl']);
  }
  el.appendChild(rows.length ? table(rows) : H('p', { class: 'muted' }, 'Henüz fiziksel iz bulunmadı.'));
  // diğer açık olay yerleri
  const others = Object.values(st.scenes).filter((s) => !s.closed && s.id !== c.sceneId);
  if (others.length) {
    el.appendChild(H('h3', null, 'Diğer açık olay yerleri'));
    for (const s of others) el.appendChild(H('div', { class: 'ev' }, H('div', { class: 'ev-t' }, POP.get(s.victim).name, H('span', { class: 'when' }, s.kind === 'serial' ? 'Seri katil' : s.kind === 'frame' ? 'Tuzak' : '')), H('div', { class: 'ev-x' }, G.place(s.place).name)));
  }
};

// ------------------------------------------------------------------ Şüpheliler
DOSSIER.tab_suspects = function (el) {
  const st = G.state, c = G.curCase();
  if (!c || c.status !== 'active') { el.appendChild(H('p', { class: 'muted' }, 'Açık bir sıradan dava yok.')); return; }
  el.appendChild(H('p', { class: 'muted small' }, '“?” bilinmeyen bilgi. Sorguda “onu oku” el/sigara/kokuyu; Grace’in geçmiş taraması ayakkabı/aracı verir. Elediğin kişiyi “Ele” ile işaretle.'));
  const grid = H('div', { class: 'sus-grid' });
  for (const s of c.suspects) {
    const p = POP.get(s.pid);
    const ks = c.k.sus[s.pid];
    const kn = G.know(s.pid);
    const card = H('div', { class: 'sus-card' + (ks.out ? ' out' : '') });
    const toggle = H('button', { class: 'mini-btn', onclick: () => { ks.out = !ks.out; card.classList.toggle('out', ks.out); toggle.textContent = ks.out ? 'Geri al' : 'Ele'; } }, ks.out ? 'Geri al' : 'Ele');
    card.appendChild(H('div', { class: 'sus-head' }, MINI.portraitEl(p.spec, 54), H('div', null, H('div', { class: 'nm' }, p.name), H('div', { class: 'rel' }, `Kurbanın ${s.relation} • ${p.job}`), H('div', { class: 'rel' }, 'Şu an: ' + POP.placeName(POP.where(p, st.day, st.time)))), toggle));
    const a = p.attrs;
    const t = H('table', { class: 'attrs' });
    const cell = (label, known, v) => t.appendChild(H('tr', null, H('th', null, label), H('td', { class: known ? '' : 'unk' }, known ? v : '?')));
    cell('Saç', true, a.hair);
    cell('El', kn.read, a.hand === 'sol' ? 'solak' : 'sağ');
    cell('Sigara', kn.read, a.smoke);
    cell('Koku', kn.read, a.scent);
    cell('Ayakkabı', kn.bg, a.shoe + ' no');
    cell('Araç', kn.bg, a.vehicle);
    card.appendChild(t);
    const info = H('div', { class: 'sus-info' });
    if (ks.motive) info.appendChild(H('p', null, H('b', null, 'İlişki: '), `“${DATA.MOTIVES[s.motive].say}”`));
    if (ks.alibi) info.appendChild(H('p', null, H('b', null, 'Mazeret: '), `“${s.alibi.claim}”`));
    if (ks.checked) info.appendChild(H('p', { class: s.alibi.ok ? 'ok' : 'bad' }, H('b', null, 'Tanık: '), `“${s.alibi.truth}”`));
    for (const hrd of ks.heard) info.appendChild(H('p', { class: 'gossip' }, H('b', null, 'Söylenti — '), hrd));
    const rd = st.evidence.find((e) => e.id === 'read_' + s.pid);
    if (rd) info.appendChild(H('p', { class: 'secret' }, H('b', null, rd.title.split(':')[0] + ': '), rd.text));
    card.appendChild(info);
    grid.appendChild(card);
  }
  el.appendChild(grid);
};

// ------------------------------------------------------------------ Deliller
DOSSIER.tab_evidence = function (el, m) {
  const st = G.state;
  const groups = [['all', 'Hepsi'], ['case', 'Dava'], ['serial', 'Seri katil'], ['net', 'Lion Lion'], ['frame', 'Tuzaklar'], ['people', 'Kişiler']];
  DOSSIER.evf = DOSSIER.evf || 'all';
  const bar = H('div', { class: 'acc-opts' });
  for (const [id, label] of groups) bar.appendChild(H('button', { class: 'opt' + (DOSSIER.evf === id ? ' on' : ''), onclick: () => { DOSSIER.evf = id; el.innerHTML = ''; DOSSIER.tab_evidence(el, m); } }, label));
  el.appendChild(bar);
  const c = G.curCase();
  const list = st.evidence.slice().reverse().filter((e) => {
    if (DOSSIER.evf === 'all') return true;
    if (DOSSIER.evf === 'case') return c && e.caseId === c.id;
    if (DOSSIER.evf === 'frame') return String(e.caseId).startsWith('frame');
    return e.caseId === DOSSIER.evf;
  });
  if (!list.length) el.appendChild(H('p', { class: 'muted' }, 'Bu grupta delil yok.'));
  for (const e of list.slice(0, 120)) {
    const item = H('div', { class: 'ev' }, H('div', { class: 'ev-t' }, e.title, H('span', { class: 'when' }, `Gün ${e.day} • ${U.fmt(e.time)}`)), H('div', { class: 'ev-x' }, e.text));
    if (e.title === 'Şifreli not' && c && e.caseId === c.id && !c.k.cipher) {
      item.appendChild(H('button', { class: 'mini-btn', onclick: () => { m.close(); G.runScript(() => TALK.solveCipher(c)); } }, 'Şifreyi çöz'));
    }
    el.appendChild(item);
  }
};

// ------------------------------------------------------------------ Seri katil
DOSSIER.tab_serial = function (el) {
  const st = G.state, se = st.serial;
  if (!se) return;
  el.appendChild(H('h3', null, se.name));
  el.appendChild(H('p', null, se.status === 'caught' ? 'Yakalandı.' : se.status === 'escaped' ? 'Kasabadan kaçtı.' : `Kurban sayısı: ${se.kills}. ${se.kills >= 6 ? '' : 'Yakalanana kadar öldürmeye devam edecek. Altı kurbandan sonra kaçar.'}`));
  // bilinen izler
  const rows = [];
  for (const id of se.scenes) {
    const sc = st.scenes[id];
    for (const cl of sc.clues) if (cl.attr && sc.found[cl.id]) rows.push([DATA.ATTRS[cl.attr].label, DATA.ATTRS[cl.attr].fmt(POP.get(se.killer).attrs[cl.attr]), 'hl']);
    for (const w of sc.witnesses) if (w.heard) rows.push(['Tanık: ' + POP.get(w.pid).first, w.text]);
  }
  el.appendChild(H('h3', null, 'Katil hakkında bilinenler'));
  el.appendChild(rows.length ? table(rows) : H('p', { class: 'muted' }, 'Henüz bir şey yok. Olay yerlerini incele, tanıkları bul.'));
  el.appendChild(H('p', { class: 'muted small' }, 'Her ölüm yeni bir iz bırakır. Grace’in veritabanında saç/ayakkabı/araç ile ara; el/sigara/koku için insanları oku. Katilin evinde gizli bir oda olabilir.'));
  el.appendChild(H('h3', null, 'Kurbanlar'));
  for (const id of se.scenes) {
    const sc = st.scenes[id];
    const v = POP.get(sc.victim);
    const left = sc.clues.filter((x) => !sc.found[x.id]).length;
    el.appendChild(H('div', { class: 'body-head small-head' }, MINI.portraitEl(v.spec, 44, true), H('div', null, H('div', { class: 'nm' }, `${v.name} (${v.age}, ${v.job})`), H('div', { class: 'small' }, `${G.place(sc.place).name} • gece ${U.hm(sc.tod % 24)} • ${left ? left + ' ipucu bulunmadı' : 'olay yeri tamamlandı'}`))));
  }
};

// ------------------------------------------------------------------ Lion Lion
DOSSIER.tab_net = function (el) {
  const st = G.state, s = st.story;
  el.appendChild(H('p', null, 'Yozlaşmış bir CIA-FBI ağı. Kimse kimseyi tanımaz: her üye emirleri yalnızca bir üstünden alır. Birini yakalamak sadece bir üst basamağı gösterir.'));
  const node = (pid) => {
    const m = s.members[pid];
    const p = POP.get(pid);
    const exposed = s.exposed[pid];
    const known = exposed || (m.rank === 1 && (s.beaHeard || s.ch >= 3)) || (m.rank >= 2 && Object.values(s.members).some((x) => x.boss === pid && s.exposed[Object.keys(s.members).find((k) => s.members[k] === x)]));
    return H('div', { class: 'node' + (exposed ? ' exposed' : '') },
      exposed ? MINI.portraitEl(p.spec, 40) : H('div', { class: 'q' }, '?'),
      H('div', { class: 'code' }, known ? m.code : '???'),
      H('div', { class: 'small' }, exposed ? p.name : (m.rank === 0 ? 'en üst' : m.rank === 1 ? 'sağ kol' : m.rank === 2 ? 'aracı' : 'saha ajanı')));
  };
  const ranks = [0, 1, 2, 3].map((r) => Object.keys(s.members).filter((id) => s.members[id].rank === r));
  const chart = H('div', { class: 'org' });
  for (const r of ranks) { const row = H('div', { class: 'org-row' }); r.forEach((id) => row.appendChild(node(id))); chart.appendChild(row); }
  el.appendChild(chart);
  if (s.ch >= 3 && !s.done) {
    el.appendChild(H('h3', null, 'Şüphe göstergesi (Yellow Bea’nın tuzakları)'));
    el.appendChild(H('div', { class: 'susbar' }, H('div', { style: `width:${s.suspicion}%` })));
    el.appendChild(H('p', { class: 'small muted' }, `${s.suspicion}/100. 100 olursa tutuklanırsın. Tuzak cinayetlerinde o saatte seni gören birini bul ya da sahte delili delil panosunda çürüt. Tutuklanma sayısı: ${s.arrests}.`));
    const B = POP.get(s.bea);
    const rows = s.beaKnown.map((k) => [DATA.ATTRS[k].label, k === 'hand' ? (B.attrs.hand === 'sol' ? 'Solak' : 'Sağ elini kullanıyor') : DATA.ATTRS[k].fmt(B.attrs[k]), 'hl']);
    el.appendChild(H('h3', null, 'Yellow Bea hakkında bilinenler'));
    el.appendChild(rows.length ? table(rows) : H('p', { class: 'muted' }, 'Henüz bir iz yok.'));
    el.appendChild(H('p', { class: 'small muted' }, s.beaRoom ? 'Bea’nın gizli odasını buldun! Artık Şef’e kanıtla gidebilirsin.' : 'Bea’yı yakalamak için onun gizli odasındaki emirleri bulmalısın.'));
  }
  const drops = s.drops.filter((d) => !d.done);
  if (drops.length) {
    el.appendChild(H('h3', null, 'Ölü noktalar'));
    for (const d of drops) el.appendChild(H('div', { class: 'ev' }, H('div', { class: 'ev-t' }, d.label), H('div', { class: 'ev-x' }, `Gün ${d.day} (${DATA.DAYS[(d.day - 1) % 7]}), 21.30–22.30 arası orada ol. Kod adı: ${STORY.codeOf(d.handler)}.`)));
  }
  el.appendChild(H('p', { class: 'small muted' }, `Ağ alarmı: ${s.alert}/100. “Lion Lion” blöfü ve yanlış suçlamalar alarmı artırır.`));
};

// ------------------------------------------------------------------ Kişiler
DOSSIER.tab_people = function (el) {
  const st = G.state;
  const met = Object.keys(st.know).filter((pid) => st.know[pid].met).map((pid) => POP.get(pid));
  el.appendChild(H('p', { class: 'muted small' }, `Tanıştığın ${met.length} kişi. Kasabada ${POP.alive().length} kişi yaşıyor. Arama: isim, meslek ya da özellik.`));
  const q = H('input', { id: 'dp-q', class: 'search', placeholder: 'ör. kızıl solak, 43, gazeteci...' });
  const list = H('div', { class: 'plist' });
  const render = () => {
    const t = q.value.toLowerCase().trim();
    list.innerHTML = '';
    const res = met.filter((p) => {
      if (!t) return true;
      const kn = G.know(p.id);
      const hay = [p.name, p.job, p.attrs.hair, kn.bg ? p.attrs.shoe + ' ' + p.attrs.vehicle : '', kn.read ? (p.attrs.hand === 'sol' ? 'solak' : 'sağ') + ' ' + p.attrs.smoke + ' ' + p.attrs.scent : ''].join(' ').toLowerCase();
      return t.split(/\s+/).every((w) => hay.includes(w));
    });
    for (const p of res.slice(0, 60)) list.appendChild(MINI.personRow(p));
    if (!res.length) list.appendChild(H('p', { class: 'muted' }, 'Kimse yok.'));
  };
  q.addEventListener('input', render);
  el.append(q, list);
  render();
};

// ------------------------------------------------------------------ Görevler
DOSSIER.tab_tasks = function (el) {
  const list = TALK.tasks();
  const ul = H('ul', { class: 'tasks' });
  for (const t of list) ul.appendChild(H('li', { class: (t.done ? 'done' : '') + (t.urgent ? ' urgent' : '') }, H('span', { class: 'box' }, t.done ? '✓' : ''), H('span', null, t.t), H('span', { class: 'where' }, t.where)));
  el.appendChild(ul);
  const nt = list.find((t) => !t.done && t.hint);
  if (nt) el.appendChild(H('p', { class: 'muted' }, 'İpucu: ' + nt.hint));
  el.appendChild(H('p', { class: 'muted small' }, 'Jade’in arabası (karakolun önünde) seni her yere 15 dakikada götürür. İnsanların günlük programı vardır: sabah işte, öğlen kafede/parkta, akşam barda ya da evde.'));
};

// ------------------------------------------------------------------ Notlar
DOSSIER.tab_notes = function (el) {
  const st = G.state;
  el.appendChild(H('p', { class: 'muted small' }, 'Kendi notların. Mesela: “43 numara → Victor, Hazel...”'));
  const ta = H('textarea', { class: 'notes', id: 'notes-ta', placeholder: 'Düşüncelerini buraya yaz...' });
  ta.value = st.notes || '';
  ta.addEventListener('input', () => { st.notes = ta.value; });
  ta.addEventListener('blur', () => G.save());
  el.appendChild(ta);
};

// ------------------------------------------------------------------ Harita
DOSSIER.tab_map = function (el) {
  const tm = WORLD.maps.town;
  const scale = 0.375;
  const cv = H('canvas', { width: tm.w * TS * scale, height: tm.h * TS * scale, class: 'minimap' });
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(tm.ground, 0, 0, cv.width, cv.height);
  for (const o of tm.objects) if (o.kind === 'building' || o.kind === 'tree' || o.kind === 'lighthouse') g.drawImage(o.img, o.x * scale, o.y * scale, o.img.width * scale, o.img.height * scale);
  const st = G.state;
  const active = Object.values(st.scenes).filter((s) => !s.closed);
  g.font = 'bold 9px "Pixelify Sans", monospace';
  g.textAlign = 'center';
  for (const b of WORLD.BUILDINGS) {
    if (b.house && !active.some((s) => s.place === b.id)) continue;
    const x = (b.x + b.w / 2) * TS * scale, y = (b.y + b.h) * TS * scale + 7;
    let label = G.place(b.id).short;
    if (active.some((s) => s.place === b.id)) label = '! ' + label;
    const w = g.measureText(label).width + 6;
    g.fillStyle = active.some((s) => s.place === b.id) ? 'rgba(160,30,30,0.9)' : 'rgba(43,29,26,0.85)';
    g.fillRect(x - w / 2, y - 8, w, 11);
    g.fillStyle = '#f7ead0'; g.fillText(label, x, y);
  }
  for (const s of active) if (s.map === 'town') { g.fillStyle = '#c0392b'; g.beginPath(); g.arc((s.body[0] + 1) * TS * scale, s.body[1] * TS * scale, 5, 0, Math.PI * 2); g.fill(); }
  const d = (st.story.drops || []).filter((x) => !x.done);
  for (const x of d) { const sp = tm.spots[x.spot]; g.fillStyle = '#e8c35a'; g.fillRect(sp[0] * TS * scale - 4, sp[1] * TS * scale - 4, 8, 8); }
  if (G.map.kind === 'town') { g.fillStyle = '#ffd25a'; g.strokeStyle = '#2b1d1a'; g.lineWidth = 2; g.beginPath(); g.arc(G.player.x * scale, G.player.y * scale, 5, 0, Math.PI * 2); g.fill(); g.stroke(); }
  el.appendChild(H('div', { class: 'map-wrap' }, cv));
  el.appendChild(H('p', { class: 'muted small' }, 'Kırmızı: olay yerleri • Sarı kare: ölü noktalar • Sarı daire: sen (dışarıdayken)'));
};

// ------------------------------------------------------------------ Kariyer
DOSSIER.tab_career = function (el) {
  const st = G.state;
  const r = MINI.rank(st.rep);
  const next = DATA.RANKS.find((x) => x.rep > st.rep);
  el.appendChild(table([
    ['Unvan', r.name], ['İtibar', `${st.rep}${next ? ` (sonraki unvan “${next.name}”: ${next.rep})` : ''}`],
    ['Çözülen / Başarısız', `${st.solved} / ${st.failed}`], ['Para', '$' + st.money], ['Maksimum odak', st.maxFocus],
    ['Bölüm', ['', 'Yeni Danışman', 'Aslan Ağı', 'Yellow Bea', 'Son Hamle', 'Epilog'][st.story.ch]],
  ]));
  el.appendChild(H('h3', null, 'Geçmiş davalar'));
  if (!st.history.length) el.appendChild(H('p', { class: 'muted' }, 'Henüz kapanan dava yok.'));
  for (const h of st.history.slice().reverse()) el.appendChild(H('div', { class: 'ev' }, H('div', { class: 'ev-t' }, `#${h.num} ${h.title}`, H('span', { class: 'when' }, `${'★'.repeat(h.stars)}${'☆'.repeat(3 - h.stars)} ${h.result}`)), H('div', { class: 'ev-x' }, `Katil: ${h.culprit}`)));
  el.appendChild(H('div', { class: 'mg-actions' }, H('button', { class: 'big alt', onclick: () => { SFX.muted = !SFX.muted; UI.toast(SFX.muted ? 'Ses kapalı' : 'Ses açık'); } }, 'Sesi aç/kapat (M)')));
};
