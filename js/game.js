'use strict';
// Ana oyun: durum, döngü, girdi, çizim, etkileşimler ve dava akışı.

const G = {
  state: null, map: null, npcs: [], keys: {}, touch: { x: 0, y: 0 },
  player: { x: 0, y: 0, dir: 0, moving: false, anim: 0 },
  cam: { x: 0, y: 0 }, S: 3, dpr: 1, t: 0, fade: 0, revealed: false, observeFx: 0,
  running: false, saveKey: 'the-deceiver-save-v1',
};

const MIN_PER_SEC = 10 / 6; // 6 gerçek saniyede 10 oyun dakikası
const SPEED = 72, RUN = 112;

const CONFESS = {
  miras: 'Bana hiçbir şey bırakmayacaktı! Hayatım boyunca onun kaprislerine katlandım, karşılığında hiçbir şey!',
  kiskanclik: 'Beni bir kenara atıp gülerek yoluna devam edecekti. Buna izin veremezdim... Veremezdim.',
  borc: 'Beni mahvedecekti. Her şeyimi, evimi, ailemi... Sadece biraz zaman istemiştim!',
  santaj: 'Yıllardır beni sağıyordu. Bir gece daha onun sesini telefonda duyamazdım.',
  intikam: 'Hayatımı o mahvetti. Ben sadece... hesabı kapattım.',
  rekabet: 'Her şeyi o aldı benden: müşterilerimi, itibarımı. Bu sefer kazanan ben olacaktım.',
};

// ============================================================ Başlatma
G.init = function () {
  G.canvas = document.getElementById('game');
  G.ctx = G.canvas.getContext('2d');
  G.lightC = document.createElement('canvas');
  G.lightG = G.lightC.getContext('2d');
  UI.init();
  WORLD.init();
  G.sparkFrames = [0, 1, 2, 3].map((k) => ART.sparkle(k / 6 + 0.01, false));
  G.sparkFramesH = [0, 1, 2, 3].map((k) => ART.sparkle(k / 6 + 0.01, true));
  G.chalk = ART.chalk();
  G.safeImg = (() => { const [c, g] = ART.canvas(16, 26); ART.FURN.safe.draw((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y + 8, w, h); }); return c; })();
  window.addEventListener('resize', G.resize);
  G.resize();
  G.bindInput();
  G.showTitle();
  requestAnimationFrame(G.loop);
};

G.resize = function () {
  G.dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  G.canvas.width = Math.floor(w * G.dpr); G.canvas.height = Math.floor(h * G.dpr);
  G.canvas.style.width = w + 'px'; G.canvas.style.height = h + 'px';
  const base = Math.max(2, Math.floor(Math.min(w / (16 * 24), h / (16 * 14))));
  G.S = base * G.dpr;
  G.lightC.width = G.canvas.width; G.lightC.height = G.canvas.height;
  G.ctx.imageSmoothingEnabled = false;
};

// ============================================================ Başlık ekranı
G.showTitle = function () {
  const t = document.getElementById('title');
  t.classList.remove('hidden');
  let has = false;
  try { has = !!localStorage.getItem(G.saveKey); } catch (e) { /* depolama kapalı */ }
  const btns = document.getElementById('title-btns');
  btns.innerHTML = '';
  if (has) btns.appendChild(U.h('button', { class: 'big', onclick: () => G.start(false) }, 'Devam Et'));
  const newBtn = U.h('button', { class: 'big' + (has ? ' alt' : '') }, 'Yeni Oyun');
  newBtn.addEventListener('click', () => {
    // Kayıt varsa sayfa içinde ikinci tıklamayla onay iste
    if (!has || newBtn.dataset.confirm) return G.start(true);
    newBtn.dataset.confirm = '1';
    newBtn.textContent = 'Kayıt silinecek — onaylamak için tekrar tıkla';
  });
  btns.appendChild(newBtn);
  btns.appendChild(U.h('button', { class: 'big alt', onclick: G.howTo }, 'Nasıl Oynanır?'));
  const pc = document.getElementById('title-jade');
  ART.portrait(pc, DATA.CAST.jade.spec);
};

G.howTo = function () {
  UI.modal({
    title: 'Nasıl Oynanır?', wide: true,
    build(b) {
      b.innerHTML = `
      <p>Sen <b>Jade</b>’sin: SSB Karakolu’nun gözü her şeyi gören, biraz fazla kendinden emin danışmanı. Her gün karakola yeni bir cinayet dosyası gelir. Görevin katili <b>kanıtla</b> bulmak.</p>
      <h3>Kontroller</h3>
      <ul>
        <li><b>WASD / Ok tuşları</b>: yürü (<b>Shift</b> ile koş)</li>
        <li><b>E / Boşluk</b>: konuş, incele, kullan</li>
        <li><b>Q</b>: Gözlem modu (odak harcar, gizli ipuçlarını gösterir)</li>
        <li><b>F / Tab</b>: Dava dosyası (deliller, şüpheliler, görevler, notlar, harita)</li>
        <li><b>M</b>: sesi aç/kapat</li>
      </ul>
      <h3>Dedektiflik</h3>
      <ul>
        <li>Olay yerindeki izler (ayak izi, saç teli, sigara, koku...) katilin profilini çıkarır. Şüphelileri <b>okuyarak</b> (sorguda Gözlem) ve Grace’in <b>geçmiş taramasıyla</b> özelliklerini öğren, sonra karşılaştır.</li>
        <li>Mazeretleri kafe, otel ve bar çalışanlarına sor. Ölüm saatini otopsiden hesapla.</li>
        <li>Parmak izi eşleştirme, şifre çözme ve kasa bulmacaları gibi küçük görevler seni bekliyor. Hiçbir ipucu tek başına yetmez; <b>birleştirmen</b> gerekir.</li>
        <li><b>Odak</b> enerjindir: çay iç, kanepede kestir. Her davanın 3 günlük süresi var. Gece 02.00’yi geçirirsen bayılırsın!</li>
        <li>Hazır olduğunda Şef Lena’ya katili, yöntemi ve motifi söyle. Yanlış suçlamanın bedeli ağırdır.</li>
      </ul>`;
    },
  });
};

G.start = function (fresh) {
  SFX.ensure();
  document.getElementById('title').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  if (!fresh) {
    try { G.state = JSON.parse(localStorage.getItem(G.saveKey)); } catch (e) { G.state = null; }
  }
  const isNew = !G.state || !G.state.case || fresh;
  if (isNew) {
    G.state = {
      day: 1, time: 8 * 60, money: 40, focus: 100, maxFocus: 100, rep: 0, solved: 0, failed: 0,
      caseNum: 0, status: null, case: null, k: null, history: [], tea: 0,
      map: 'station', px: 0, py: 0, dir: 0, seedBase: (Date.now() % 1000000) + 17,
    };
    G.newCase();
    const sp = WORLD.INTERIORS.station.spawn;
    G.enterMap('station', sp[0], sp[1], 0, true);
  } else {
    G.enterMap(G.state.map, null, null, G.state.dir, true);
    G.player.x = G.state.px; G.player.y = G.state.py;
    G.snapCam();
  }
  G.running = true;
  if (isNew) G.intro();
  else UI.toast(`Gün ${G.state.day} • ${G.dayName()} • ${U.fmt(G.state.time)}`);
};

G.intro = async function () {
  const boss = G.cast('boss');
  await UI.say(null, `${DATA.TOWN}, Kaliforniya. SSB Karakolu. Sabah saat 08.00.`);
  await UI.say(G.cast('jade'), 'Bu kanepe kasabadaki en iyi düşünme yeri. Bir de en iyi uyuma yeri.');
  await UI.say(boss, 'JADE! Kanepeden kalk. Masamda yeni bir dosya var. Ofisime gel. Hemen!');
  await UI.say(null, 'İpucu: Şef Lena sağdaki ofiste. Ona yürü ve E (veya ekrandaki E düğmesi) ile konuş. Dava dosyası için F.');
};

// ============================================================ Yardımcılar
G.cast = (id) => ({ name: DATA.CAST[id].name, spec: DATA.CAST[id].spec });
G.dayName = () => DATA.DAYS[(G.state.day - 1) % 7];
G.place = (id) => DATA.PLACES[id];
G.sus = (id) => G.state.case.suspects.find((s) => s.id === id);
G.active = () => G.state.status === 'active';

G.save = function () {
  if (!G.state) return;
  G.state.px = G.player.x; G.state.py = G.player.y; G.state.dir = G.player.dir; G.state.map = G.map.id;
  try { localStorage.setItem(G.saveKey, JSON.stringify(G.state)); } catch (e) { /* kayıt alanı yok */ }
};

// Bayılma kontrolü, betik bittikten sonra G.update içinde yapılır.
G.advance = function (min) {
  G.state.time += min;
};

G.useFocus = function (n) {
  if (G.state.focus < n) { UI.toast('Odak yetersiz! Çay iç ya da biraz dinlen.', 'bad'); SFX.bad(); return false; }
  G.state.focus -= n;
  return true;
};
G.gainFocus = (n) => { G.state.focus = Math.min(G.state.maxFocus, G.state.focus + n); };

G.addEvidence = function (id, title, text, silent) {
  const k = G.state.k;
  if (k.evidence.some((e) => e.id === id)) return;
  k.evidence.push({ id, title, text, day: G.state.day, time: G.state.time });
  if (!silent) UI.toast('Dosyaya eklendi: ' + title, 'good');
};

// ============================================================ Dava yaşam döngüsü
G.newCase = function () {
  const st = G.state;
  st.caseNum += 1;
  let c = null;
  for (let i = 0; i < 20 && !c; i++) {
    try { c = CASEGEN.generate(st.seedBase * 31 + st.caseNum * 7919 + i * 104729, st.caseNum); } catch (e) { console.warn(e); }
  }
  st.case = c;
  st.k = CASEGEN.newKnowledge(c);
  st.status = 'pending';
};

G.tasks = function () {
  const st = G.state, c = st.case, k = st.k;
  if (!c || st.status === 'closed') return [{ t: 'Kanepede uyu; yarın yeni dava gelecek', done: false, where: 'Karakol' }];
  if (st.status === 'pending') return [{ t: 'Şef Lena ile konuş: yeni bir dava var', done: false, where: 'Karakol' }];
  const L = [];
  const total = c.clues.length, found = c.clues.filter((cl) => k.found[cl.id]).length;
  const hiddenLeft = c.clues.some((cl) => cl.hidden && !k.found[cl.id]);
  L.push({ t: `Olay yerini incele (${found}/${total} ipucu)`, done: found === total, where: G.place(c.scene).short, hint: hiddenLeft && found >= total - 2 ? 'Bazı ipuçları yalnızca Gözlem (Q) ile görünür.' : null });
  L.push({ t: 'Olay yerinin önündeki komşu tanıkla konuş', done: k.neighbor, where: G.place(c.scene).short + ' önü' });
  L.push({ t: 'Otopsi bulgularını Dr. Ortiz ile yorumla', done: k.autopsy, where: 'Adli Tıp' });
  for (const s of c.suspects) {
    const ks = k.sus[s.id];
    L.push({ t: `${s.name}: sorgula (ilişki, mazeret) ve oku`, done: ks.met && ks.motive && ks.alibi && ks.read, where: G.place(s.loc).short });
  }
  L.push({ t: 'Şüphelilerin geçmişini Grace’e tarat', done: c.suspects.every((s) => k.sus[s.id].bg), where: 'Karakol' });
  const verifiable = c.suspects.filter((s) => s.alibi.place);
  L.push({ t: 'Mazeretleri tanıklara doğrulat', done: verifiable.every((s) => k.sus[s.id].checked), where: 'Kafe / Otel / Bar' });
  if (c.feats.print && k.found.print) L.push({ t: 'Kısmi parmak izini Sam ile karşılaştır', done: k.print, where: 'Adli Tıp' });
  if (c.feats.cipher && k.found.cipher) L.push({ t: 'Şifreli notu çöz (Dosya → Deliller)', done: k.cipher, where: 'Dosya' });
  if (c.feats.safe && k.sceneVisited) L.push({ t: 'Kurbanın kasasını aç', done: k.safe, where: G.place(c.scene).short });
  L.push({ t: 'Katili Şef Lena’ya bildir', done: false, where: 'Karakol' });
  return L;
};

G.nextTask = function () { return G.tasks().find((t) => !t.done); };

// ============================================================ Haritalar ve NPC'ler
G.enterMap = function (id, tx, ty, dir, instant) {
  const m = WORLD.maps[id];
  G.map = m;
  G.revealed = false;
  if (tx != null) { G.player.x = tx * TS + 8; G.player.y = ty * TS + 12; }
  G.player.dir = dir || 0;
  G.npcs = G.npcsFor(id);
  if (G.state.case && G.active() && id === G.state.case.scene && !G.state.k.sceneVisited) {
    G.state.k.sceneVisited = true;
    setTimeout(() => G.sceneArrival(), 350);
  }
  G.snapCam();
  if (!instant) { G.fade = 1; SFX.door(); }
  G.save();
};

G.mkNpc = function (o) {
  return Object.assign({ dir: 0, anim: 0, moving: false }, o, { x: o.tx * TS + 8, y: o.ty * TS + 12 });
};

G.npcsFor = function (id) {
  const L = [];
  const st = G.state, c = st.case;
  const m = WORLD.maps[id];
  const spot = (key) => m.spots && m.spots[key];
  const castNpc = (cid, key) => { const s = spot(key); if (s) L.push(G.mkNpc({ id: cid, name: DATA.CAST[cid].name, spec: DATA.CAST[cid].spec, tx: s[0], ty: s[1], dir: s[2] })); };
  if (id === 'station') ['boss', 'grace', 'kevin', 'ray'].forEach((k) => castNpc(k, k));
  if (id === 'lab') { castNpc('ortiz', 'ortiz'); castNpc('sam', 'sam'); }
  if (id === 'cafe') castNpc('mia', 'mia');
  if (id === 'hotel') castNpc('hector', 'hector');
  if (id === 'bar') castNpc('lou', 'lou');
  if (c && G.active()) {
    for (const s of c.suspects) if (s.loc === id) { const sp = spot('guest'); L.push(G.mkNpc({ id: 'sus:' + s.id, name: s.name, spec: s.spec, tx: sp[0], ty: sp[1], dir: sp[2] })); }
    if (id === c.scene) {
      const used = new Set(c.clues.map((cl) => cl.x + ',' + cl.y));
      if (c.safe) used.add(c.safe.x + ',' + c.safe.y);
      const opts = WORLD.free[id].filter(([x, y]) => !used.has(x + ',' + y));
      const tgt = [m.door.x + 2, m.h - 3];
      opts.sort((a, b) => (Math.abs(a[0] - tgt[0]) + Math.abs(a[1] - tgt[1])) - (Math.abs(b[0] - tgt[0]) + Math.abs(b[1] - tgt[1])));
      const p = opts[0];
      L.push(G.mkNpc({ id: 'cop', name: DATA.CAST.cop.name, spec: DATA.CAST.cop.spec, tx: p[0], ty: p[1], dir: 0 }));
    }
    if (id === 'town') {
      const b = WORLD.building(c.scene);
      const cands = [[2, 1], [-2, 1], [2, 2], [-2, 2], [3, 1], [-3, 1], [1, 2], [-1, 2]];
      for (const [dx, dy] of cands) {
        const x = b.door.x + dx, y = b.door.y + dy;
        if (!WORLD.isSolid(m, x, y)) { L.push(G.mkNpc({ id: 'neighbor', name: c.neighbor.name, spec: c.neighbor.spec, tx: x, ty: y, dir: dx > 0 ? 2 : 3 })); break; }
      }
    }
  }
  if (id === 'town') {
    const homes = [[12, 18], [36, 16], [47, 41]];
    DATA.WALKERS.forEach((w, i) => {
      L.push(G.mkNpc({ id: 'walker:' + i, name: w.name, spec: w.spec, tx: homes[i][0], ty: homes[i][1], dir: 0, home: homes[i], wander: { t: 1 + i, tx: null, ty: null } }));
    });
  }
  return L;
};

// ============================================================ Girdi
G.bindInput = function () {
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(k) && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) e.preventDefault();
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && k !== 'Escape') return;
    SFX.ensure();
    if (!G.running) return;
    if (k === 'm' || k === 'M') { SFX.muted = !SFX.muted; UI.toast(SFX.muted ? 'Ses kapalı' : 'Ses açık'); return; }
    if (UI.key(k)) return;
    G.keys[k.toLowerCase()] = true;
    if (e.repeat) return;
    if (k === 'e' || k === 'E' || k === ' ' || k === 'Enter') G.interact();
    else if (k === 'q' || k === 'Q') G.observe();
    else if (k === 'f' || k === 'F' || k === 'Tab') DOSSIER.open();
  });
  window.addEventListener('keyup', (e) => { G.keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { G.keys = {}; });
  // Dokunmatik kontroller
  const pad = document.getElementById('dpad');
  const setDir = (e) => {
    const r = pad.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len < 8) { G.touch.x = 0; G.touch.y = 0; return; }
    G.touch.x = dx / len; G.touch.y = dy / len;
    const knob = document.getElementById('dknob');
    const kl = Math.min(len, r.width / 2 - 18);
    knob.style.transform = `translate(${(dx / len) * kl}px, ${(dy / len) * kl}px)`;
  };
  const clear = () => { G.touch.x = 0; G.touch.y = 0; document.getElementById('dknob').style.transform = ''; };
  pad.addEventListener('touchstart', (e) => { e.preventDefault(); setDir(e); }, { passive: false });
  pad.addEventListener('touchmove', (e) => { e.preventDefault(); setDir(e); }, { passive: false });
  pad.addEventListener('touchend', clear); pad.addEventListener('touchcancel', clear);
  const btn = (id, fn) => document.getElementById(id).addEventListener('touchstart', (e) => { e.preventDefault(); SFX.ensure(); if (!G.running) return; fn(); }, { passive: false });
  btn('tb-e', () => { if (!UI.key('e')) G.interact(); });
  btn('tb-q', () => { if (!UI.busy()) G.observe(); });
  btn('tb-f', () => { if (!UI.busy()) DOSSIER.open(); });
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
};

// ============================================================ Döngü
G.last = 0;
G.loop = function (ts) {
  const dt = Math.min(0.05, (ts - G.last) / 1000 || 0);
  G.last = ts;
  G.t += dt;
  if (G.running && G.map) {
    if (!UI.busy() && !G.scripting) G.update(dt);
    G.render();
    G.updateHud();
  }
  requestAnimationFrame(G.loop);
};

G.update = function (dt) {
  const st = G.state;
  st.time += dt * MIN_PER_SEC;
  if (st.time >= 26 * 60) { G.faint(); return; }
  // Hareket
  let mx = 0, my = 0;
  const K = G.keys;
  if (K['a'] || K['arrowleft']) mx -= 1;
  if (K['d'] || K['arrowright']) mx += 1;
  if (K['w'] || K['arrowup']) my -= 1;
  if (K['s'] || K['arrowdown']) my += 1;
  if (!mx && !my) { mx = G.touch.x; my = G.touch.y; }
  const p = G.player;
  const len = Math.hypot(mx, my);
  p.moving = len > 0.2;
  if (p.moving) {
    mx /= len; my /= len;
    if (Math.abs(mx) > Math.abs(my)) p.dir = mx < 0 ? 2 : 3; else p.dir = my < 0 ? 1 : 0;
    const sp = (K['shift'] ? RUN : SPEED) * dt;
    G.moveBody(p, mx * sp, 0, true);
    G.moveBody(p, 0, my * sp, true);
    p.anim += dt * (K['shift'] ? 11 : 8);
  } else p.anim = 0;
  // Kapılar
  const tx = Math.floor(p.x / TS), ty = Math.floor((p.y - 3) / TS);
  if (G.map.kind === 'town') {
    const d = G.map.doors.find((dd) => dd.x === tx && dd.y === ty);
    if (d) { const im = WORLD.maps[d.to]; G.enterMap(d.to, im.door.x, im.h - 2, 1); return; }
  } else if (ty >= G.map.h - 1) {
    const b = WORLD.building(G.map.id);
    G.enterMap('town', b.door.x, b.door.y + 1, 0);
    return;
  }
  // NPC'ler
  for (const n of G.npcs) if (n.wander) G.updateWalker(n, dt);
  // Kamera
  G.followCam(dt);
  if (G.fade > 0) G.fade = Math.max(0, G.fade - dt * 3);
  if (G.observeFx > 0) G.observeFx = Math.max(0, G.observeFx - dt);
  G.autosaveT = (G.autosaveT || 0) + dt;
  if (G.autosaveT > 20) { G.autosaveT = 0; G.save(); }
};

G.blocked = function (body, x, y) {
  const m = G.map;
  const x0 = Math.floor((x - 5) / TS), x1 = Math.floor((x + 5) / TS);
  const y0 = Math.floor((y - 5) / TS), y1 = Math.floor((y - 0.5) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (WORLD.isSolid(m, tx, ty)) return true;
    if (G.dynSolid(tx, ty)) return true;
  }
  for (const n of G.npcs) {
    if (n === body) continue;
    if (Math.abs(n.x - x) < 10 && Math.abs(n.y - y) < 6) return true;
  }
  if (body !== G.player && Math.abs(G.player.x - x) < 10 && Math.abs(G.player.y - y) < 6) return true;
  return false;
};

G.dynSolid = function (tx, ty) {
  const c = G.state.case;
  return !!(c && c.safe && G.active() && G.map.id === c.scene && c.safe.x === tx && c.safe.y === ty);
};

G.moveBody = function (b, dx, dy) {
  const nx = b.x + dx, ny = b.y + dy;
  if (!G.blocked(b, nx, ny)) { b.x = nx; b.y = ny; return true; }
  // köşelerden kayma
  if (dx && !dy) for (const off of [-4, 4]) if (!G.blocked(b, nx, b.y + off) && !G.blocked(b, b.x, b.y + off)) { b.y += off * 0.25; return false; }
  if (dy && !dx) for (const off of [-4, 4]) if (!G.blocked(b, b.x + off, ny) && !G.blocked(b, b.x + off, b.y)) { b.x += off * 0.25; return false; }
  return false;
};

G.updateWalker = function (n, dt) {
  const w = n.wander;
  w.t -= dt;
  if (w.tx == null) {
    n.moving = false; n.anim = 0;
    if (w.t <= 0) {
      const tx = n.home[0] + Math.floor(Math.random() * 9) - 4, ty = n.home[1] + Math.floor(Math.random() * 5) - 2;
      if (!WORLD.isSolid(G.map, tx, ty)) { w.tx = tx * TS + 8; w.ty = ty * TS + 12; w.t = 6; }
      else w.t = 0.5;
    }
    return;
  }
  const dx = w.tx - n.x, dy = w.ty - n.y;
  const d = Math.hypot(dx, dy);
  if (d < 2 || w.t <= 0) { w.tx = null; w.t = 2 + Math.random() * 4; return; }
  const sp = 30 * dt;
  const mx = dx / d, my = dy / d;
  if (Math.abs(mx) > Math.abs(my)) n.dir = mx < 0 ? 2 : 3; else n.dir = my < 0 ? 1 : 0;
  const okx = G.moveBody(n, mx * sp, 0);
  const oky = G.moveBody(n, 0, my * sp);
  if (!okx && !oky) { w.tx = null; w.t = 1; }
  n.moving = true; n.anim += dt * 6;
};

G.viewW = () => G.canvas.width / G.S;
G.viewH = () => G.canvas.height / G.S;

G.camTarget = function () {
  const vw = G.viewW(), vh = G.viewH();
  const mw = G.map.w * TS, mh = G.map.h * TS;
  let x = G.player.x - vw / 2, y = G.player.y - 12 - vh / 2;
  x = mw <= vw ? (mw - vw) / 2 : U.clamp(x, 0, mw - vw);
  y = mh <= vh ? (mh - vh) / 2 : U.clamp(y, 0, mh - vh);
  return [x, y];
};
G.snapCam = function () { const [x, y] = G.camTarget(); G.cam.x = x; G.cam.y = y; };
G.followCam = function (dt) {
  const [x, y] = G.camTarget();
  const k = 1 - Math.pow(0.0001, dt);
  G.cam.x += (x - G.cam.x) * k; G.cam.y += (y - G.cam.y) * k;
};

// ============================================================ Çizim
G.drawChar = function (ctx, c) {
  const sheet = ART.charSheet(c.spec);
  const frame = c.moving ? [1, 0, 2, 0][Math.floor(c.anim) % 4] : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(Math.round(c.x), Math.round(c.y) - 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(sheet.img, frame * sheet.cw, c.dir * sheet.ch, sheet.cw, sheet.ch, Math.round(c.x) - 9, Math.round(c.y) - 25, sheet.cw, sheet.ch);
};

G.render = function () {
  const ctx = G.ctx, S = G.S;
  const m = G.map;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = m.kind === 'town' ? '#24331f' : '#140e0c';
  ctx.fillRect(0, 0, G.canvas.width, G.canvas.height);
  const cx = Math.round(G.cam.x * S) / S, cy = Math.round(G.cam.y * S) / S;
  ctx.save();
  ctx.setTransform(S, 0, 0, S, -cx * S, -cy * S);
  ctx.drawImage(m.ground, 0, 0);
  // Su parıltısı
  if (m.kind === 'town') {
    ctx.fillStyle = 'rgba(214,238,248,0.5)';
    for (let i = 0; i < 18; i++) {
      const x = ((i * 97 + Math.floor(G.t * 8) * 3) % (m.w * TS)), y = 42 * TS + 6 + (i * 13) % 24;
      ctx.fillRect(x, y, 3, 1);
    }
  }
  const c = G.state.case;
  const atScene = c && G.active() && m.id === c.scene;
  if (atScene) {
    if (m.body) ctx.drawImage(G.chalk, m.body[0] * TS, m.body[1] * TS - 4);
    const k = G.state.k;
    let n = 1;
    for (const cl of c.clues) {
      if (k.found[cl.id]) {
        ctx.fillStyle = '#f2d22e'; ctx.fillRect(cl.x * TS + 5, cl.y * TS + 6, 6, 6);
        ctx.fillStyle = '#222'; ctx.font = 'bold 5px monospace'; ctx.fillText(String(n), cl.x * TS + 6.5, cl.y * TS + 11);
        n++;
        continue;
      }
      if (cl.hidden && !G.revealed) continue;
      const f = Math.floor(G.t * 6) % 4;
      ctx.drawImage(cl.hidden ? G.sparkFramesH[f] : G.sparkFrames[f], cl.x * TS, cl.y * TS - 2 + Math.sin(G.t * 4) * 1.5);
    }
    if (c.safe) ctx.drawImage(G.safeImg, c.safe.x * TS, c.safe.y * TS - 10);
  }
  // Y sıralı nesneler
  const vx0 = cx - 48, vx1 = cx + G.viewW() + 48, vy0 = cy - 48, vy1 = cy + G.viewH() + 80;
  const list = [];
  for (const o of m.objects) {
    if (o.x > vx1 || o.y > vy1 || o.x + o.img.width < vx0 || o.y + o.img.height < vy0) continue;
    list.push(o);
  }
  for (const n of G.npcs) list.push({ base: n.y, npc: n });
  list.push({ base: G.player.y, npc: Object.assign({ spec: DATA.CAST.jade.spec }, G.player) });
  list.sort((a, b) => a.base - b.base);
  for (const o of list) {
    if (o.npc) G.drawChar(ctx, o.npc);
    else ctx.drawImage(o.img, Math.round(o.x), Math.round(o.y));
  }
  // Konuşulabilir şüpheli işareti
  for (const n of G.npcs) {
    if (!n.id.startsWith('sus:') && n.id !== 'neighbor') continue;
    const done = n.id === 'neighbor' ? G.state.k.neighbor : G.state.k.sus[n.id.slice(4)].read;
    if (done) continue;
    const by = n.y - 32 + Math.sin(G.t * 3) * 1.5;
    ctx.fillStyle = '#2b1d1a'; ctx.fillRect(n.x - 2, by - 1, 5, 9);
    ctx.fillStyle = '#ffd25a'; ctx.fillRect(n.x - 1, by, 3, 5); ctx.fillRect(n.x - 1, by + 6, 3, 1);
  }
  // Etkileşim balonu
  const tgt = G.findTarget();
  if (tgt && !UI.busy()) {
    const bx = Math.round(tgt.px) - 6, by = Math.round(tgt.py) - 8 + Math.round(Math.sin(G.t * 5));
    ctx.fillStyle = '#2b1d1a'; ctx.fillRect(bx - 1, by - 1, 14, 12);
    ctx.fillStyle = '#f7ead0'; ctx.fillRect(bx, by, 12, 10);
    ctx.fillStyle = '#2b1d1a'; ctx.font = 'bold 8px monospace'; ctx.fillText('E', bx + 3.5, by + 8);
  }
  ctx.restore();

  G.renderLight();

  // Bina isimleri
  if (m.kind === 'town') {
    ctx.save();
    ctx.font = `${Math.round(5.5 * S)}px "Pixelify Sans", monospace`;
    ctx.textAlign = 'center';
    for (const b of WORLD.BUILDINGS) {
      const dx = (b.door.x + 0.5) * TS - G.player.x, dy = (b.door.y + 1) * TS - G.player.y;
      if (dx * dx + dy * dy > (TS * 4.5) ** 2) continue;
      const sx = ((b.door.x + 0.5) * TS - cx) * S, sy = ((b.door.y - 2.2) * TS - cy) * S;
      const label = b.name + (c && G.active() && c.scene === b.id ? ' 🚨' : '');
      const w = ctx.measureText(label).width + 6 * S;
      ctx.fillStyle = 'rgba(43,29,26,0.85)'; ctx.fillRect(sx - w / 2, sy - 6 * S, w, 9 * S);
      ctx.fillStyle = '#f7ead0'; ctx.fillText(label, sx, sy + 0.8 * S);
    }
    ctx.restore();
  }
  if (G.observeFx > 0) {
    const a = G.observeFx;
    const g = ctx.createRadialGradient(G.canvas.width / 2, G.canvas.height / 2, G.canvas.height * 0.2, G.canvas.width / 2, G.canvas.height / 2, G.canvas.height * 0.8);
    g.addColorStop(0, 'rgba(160,120,255,0)'); g.addColorStop(1, `rgba(120,80,220,${0.5 * a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, G.canvas.width, G.canvas.height);
  }
  if (G.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${G.fade})`; ctx.fillRect(0, 0, G.canvas.width, G.canvas.height); }
};

G.darkness = function () {
  const h = G.state.time / 60;
  if (h < 17.5) return 0;
  if (h < 21) return ((h - 17.5) / 3.5) * 0.62;
  return 0.62;
};

G.renderLight = function () {
  let a = G.darkness();
  if (G.map.kind !== 'town') a *= 0.3;
  if (a <= 0.01) return;
  const L = G.lightG, S = G.S;
  const W = G.lightC.width, H = G.lightC.height;
  L.globalCompositeOperation = 'source-over';
  L.clearRect(0, 0, W, H);
  L.fillStyle = `rgba(14,18,52,${a})`;
  L.fillRect(0, 0, W, H);
  L.globalCompositeOperation = 'destination-out';
  const lights = G.map.lights.slice();
  lights.push({ x: G.player.x, y: G.player.y - 10, r: 34 });
  for (const l of lights) {
    const sx = (l.x - G.cam.x) * S, sy = (l.y - G.cam.y) * S, r = l.r * S;
    if (sx < -r || sy < -r || sx > W + r || sy > H + r) continue;
    const g = L.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    L.fillStyle = g; L.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  G.ctx.drawImage(G.lightC, 0, 0);
  // sıcak lamba parıltısı
  if (G.map.kind === 'town') {
    G.ctx.save();
    G.ctx.globalCompositeOperation = 'lighter';
    for (const l of G.map.lights) {
      const sx = (l.x - G.cam.x) * S, sy = (l.y - G.cam.y) * S, r = l.r * 0.6 * S;
      if (sx < -r || sy < -r || sx > W + r || sy > H + r) continue;
      const g = G.ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, `rgba(255,190,90,${0.28 * a})`); g.addColorStop(1, 'rgba(255,190,90,0)');
      G.ctx.fillStyle = g; G.ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    G.ctx.restore();
  }
};

G.updateHud = function () {
  const st = G.state;
  UI.setHud('h-day', `Gün ${st.day} • ${G.dayName()}`);
  UI.setHud('h-time', U.fmt(Math.floor(st.time / 10) * 10));
  UI.setHud('h-money', '$' + st.money);
  UI.setHud('h-focus', Math.round((st.focus / st.maxFocus) * 100) + '%', 'width');
  UI.setHud('h-focus-txt', `${Math.round(st.focus)}/${st.maxFocus}`);
  const c = st.case;
  UI.setHud('hc-title', c && st.status !== 'closed' ? `Dava #${c.num}: ${c.title}` : 'Dava yok');
  const nt = G.nextTask();
  UI.setHud('hc-task', nt ? `▸ ${nt.t} (${nt.where})` : '');
  UI.setHud('hc-dead', c && G.active() ? `Süre: ${DATA.DAYS[(st.deadline - 1) % 7]} 24.00’e kadar (Gün ${st.deadline})` : '');
};

// ============================================================ Etkileşim hedefi
G.frontPoint = function (dist) {
  const p = G.player;
  const d = [[0, 1], [0, -1], [-1, 0], [1, 0]][p.dir];
  return [p.x + d[0] * dist, p.y - 4 + d[1] * dist, d];
};

G.findTarget = function () {
  if (!G.map) return null;
  const p = G.player;
  const [fx, fy, d] = G.frontPoint(12);
  // NPC
  let best = null, bd = 13;
  for (const n of G.npcs) {
    const dist = Math.hypot(n.x - fx, n.y - 4 - fy);
    if (dist < bd) { bd = dist; best = n; }
  }
  if (best) return { kind: 'npc', npc: best, px: best.x, py: best.y - 30 };
  const ftx = Math.floor(fx / TS), fty = Math.floor(fy / TS);
  const ptx = Math.floor(p.x / TS), pty = Math.floor((p.y - 3) / TS);
  // Tezgâh arkasındaki NPC
  if (G.map.reach && G.map.reach[fty * G.map.w + ftx]) {
    const bx = ftx + d[0], by = fty + d[1];
    const n = G.npcs.find((nn) => Math.floor(nn.x / TS) === bx && Math.floor((nn.y - 3) / TS) === by);
    if (n) return { kind: 'npc', npc: n, px: n.x, py: n.y - 30 };
  }
  const c = G.state.case;
  if (c && G.active() && G.map.id === c.scene) {
    for (const cl of c.clues) {
      if (G.state.k.found[cl.id] || (cl.hidden && !G.revealed)) continue;
      if ((cl.x === ftx && cl.y === fty) || (cl.x === ptx && cl.y === pty)) return { kind: 'clue', clue: cl, px: cl.x * TS + 8, py: cl.y * TS - 6 };
    }
    if (c.safe && c.safe.x === ftx && c.safe.y === fty) return { kind: 'safe', px: c.safe.x * TS + 8, py: c.safe.y * TS - 12 };
  }
  const act = G.map.acts[ftx + ',' + fty];
  if (act) return { kind: 'act', act, px: ftx * TS + 8, py: fty * TS - 4 };
  return null;
};

G.interact = async function () {
  if (UI.busy() || G.scripting) return;
  const t = G.findTarget();
  if (!t) return;
  G.scripting = true;
  try {
    if (t.kind === 'npc') {
      const n = t.npc;
      n.dir = Math.abs(G.player.x - n.x) > Math.abs(G.player.y - n.y) ? (G.player.x < n.x ? 2 : 3) : (G.player.y < n.y ? 1 : 0);
      if (n.wander) { n.wander.tx = null; n.wander.t = 4; n.moving = false; }
      await G.talk(n);
    } else if (t.kind === 'clue') await G.pickClue(t.clue);
    else if (t.kind === 'safe') await G.openSafe();
    else if (t.kind === 'act') await G.useAct(t.act);
  } catch (e) { console.error(e); }
  G.scripting = false;
  G.save();
};

// ============================================================ Gözlem (Q)
G.observe = function () {
  if (UI.busy() || G.scripting) return;
  const c = G.state.case;
  if (c && G.active() && G.map.id === c.scene) {
    const hiddenLeft = c.clues.filter((cl) => cl.hidden && !G.state.k.found[cl.id]);
    if (G.revealed) { UI.toast('Gözlem zaten açık. Mor parıltılara bak.'); return; }
    if (!hiddenLeft.length) { UI.toast('Jade odayı süzüyor: “Burada gözden kaçan bir şey kalmadı.”'); return; }
    if (!G.useFocus(10)) return;
    G.revealed = true; G.observeFx = 1.2; SFX.focus();
    UI.toast(`Gözlem: ${hiddenLeft.length} gizli ayrıntı belirdi! (−10 odak)`, 'good');
    return;
  }
  G.observeFx = 0.6;
  UI.toast('Jade etrafı süzüyor: “' + DATA.JADE_QUIPS[Math.floor(Math.random() * DATA.JADE_QUIPS.length)] + '”');
};

// ============================================================ Konuşmalar
G.talk = async function (n) {
  const id = n.id;
  const who = { name: n.name, spec: n.spec };
  if (id === 'boss') return G.talkBoss(who);
  if (id === 'grace') return G.talkGrace(who);
  if (id === 'kevin') return G.talkKevin(who);
  if (id === 'ray') return G.talkRay(who);
  if (id === 'ortiz') return G.talkOrtiz(who);
  if (id === 'sam') return G.talkSam(who);
  if (id === 'mia' || id === 'hector' || id === 'lou') return G.talkWitness(id, who);
  if (id === 'cop') return UI.say(who, G.state.k.found && Object.keys(G.state.k.found).length ? 'Kimse bir şeye dokunmadı, Bay Jade. Sizin dışınızda tabii.' : 'Olay yerini korudum, Bay Jade. Cesedi sabah götürdüler; tebeşir izi orada. Gerisi sizde.');
  if (id === 'neighbor') return G.talkNeighbor(who);
  if (id.startsWith('sus:')) return G.talkSuspect(G.sus(id.slice(4)), who);
  if (id.startsWith('walker:')) {
    const w = DATA.WALKERS[+id.split(':')[1]];
    return UI.say(who, w.lines[Math.floor(Math.random() * w.lines.length)]);
  }
};

G.talkBoss = async function (who) {
  const st = G.state, c = st.case;
  if (!c || st.status === 'closed') {
    return UI.say(who, 'Bugünlük iş yok, Jade. Git kanepende uyu; yarın sabah masamda yeni bir dosya olur, eminim.');
  }
  if (st.status === 'pending') return G.briefing(who);
  for (;;) {
    const i = await UI.choose(who, 'Evet, Jade? Bir şey bulduysan söyle.', [
      'Katili buldum. (Suçlama yap)',
      'Davayı bir daha özetler misin?',
      'Şüpheliler nerede?',
      'Hiç. Sadece seni görmeye geldim.',
    ]);
    if (i === 0) { await G.accuse(who); return; }
    if (i === 1) await G.caseSummary(who);
    if (i === 2) {
      for (const s of c.suspects) await UI.say(who, `${s.name} (kurbanın ${s.relation}): ${G.place(s.loc).name}.`);
    }
    if (i === 3) { await UI.say(who, 'Çok tatlı. Şimdi git ve işini yap.'); return; }
  }
};

G.caseSummary = async function (who) {
  const c = G.state.case;
  await UI.say(who, `Kurban: ${c.victim.name}, ${c.victim.job}. Cesedi bu sabah saat 06.00’da ${c.finder} bulmuş. Olay yeri: ${G.place(c.scene).name}.`);
};

G.briefing = async function (who) {
  const st = G.state, c = st.case;
  const jade = G.cast('jade');
  await UI.say(who, 'Jade, nihayet. Çayını sonra içersin. Yeni bir davamız var.');
  await G.caseSummary(who);
  await UI.say(who, 'Dört kişi öne çıkıyor. Hepsinin bir sebebi var gibi:');
  for (const s of c.suspects) await UI.say(who, `${s.name}: kurbanın ${s.relation}. Şu an ${G.place(s.loc).name} civarında.`);
  await UI.say(who, 'Olay yerine git, Dr. Ortiz’in otopsi bulgularına bak, şüphelilerle konuş. Ve lütfen... kimseyi hipnotize etme.');
  await UI.say(jade, 'Söz veremem ama elimden geleni yaparım. Ki bu genelde fazlasıdır.');
  st.status = 'active';
  st.deadline = st.day + 2;
  await UI.say(who, `${DATA.DAYS[(st.deadline - 1) % 7]} gece yarısına kadar vaktin var. Katili bulunca bana gel; katili, yöntemi ve motifi söyleyeceksin.`);
  G.addEvidence('brief', 'Dava özeti', `Kurban ${c.victim.name} (${c.victim.job}). Ceset sabah 06.00’da ${c.finder} tarafından bulundu. Olay yeri: ${G.place(c.scene).name}. Şüpheliler: ${c.suspects.map((s) => `${s.name} (${s.relation})`).join(', ')}.`, true);
  UI.toast(`Yeni dava: ${c.title}`, 'good');
  SFX.good();
  G.npcs = G.npcsFor(G.map.id);
};

G.talkGrace = async function (who) {
  const st = G.state, c = st.case, k = st.k;
  if (!c || !G.active()) return UI.say(who, 'Sistem sakin. Dava gelince her şeyi tarayabilirim; banka, sabıka, araç kayıtları... Sen söyle, ben bulayım.');
  const todo = c.suspects.filter((s) => k.sus[s.id].met && !k.sus[s.id].bg);
  const unmet = c.suspects.filter((s) => !k.sus[s.id].met).length;
  if (!todo.length) {
    if (unmet) return UI.say(who, `Taramak için önce şüphelilerle tanışman lazım; tam isim, doğum tarihi falan. Daha ${unmet} kişiyle konuşmadın.`);
    return UI.say(who, 'Herkesi taradım. Ayakkabı numaraları ve araçlar dosyanda. Gerisi senin o tuhaf beyninde.');
  }
  const opts = todo.map((s) => `${s.name} (30 dk)`);
  if (todo.length > 1) opts.push(`Hepsini tara (${todo.length * 30} dk)`);
  opts.push('Sonra.');
  const i = await UI.choose(who, 'Kimi tarayayım? Ayakkabı numarası, araç kaydı, mali durum; ne varsa.', opts);
  let list = [];
  if (i < todo.length) list = [todo[i]];
  else if (todo.length > 1 && i === todo.length) list = todo;
  for (const s of list) {
    G.advance(30);
    k.sus[s.id].bg = true;
    const extra = ['Sabıka kaydı temiz.', 'Birkaç ödenmemiş park cezası var.', 'Kredi kartı borçları yüksek.', 'On yıl önce bir kavga yüzünden gözaltı kaydı var.', 'Geçen yıl bir şirket kurmuş, batmış.', 'Son ayda hesabından büyük para çekilmiş.'][(s.name.length + c.seed) % 6];
    const txt = `Ayakkabı: ${s.attrs.shoe} numara. Kayıtlı araç: ${s.attrs.vehicle}. ${extra}`;
    G.addEvidence('bg_' + s.id, 'Geçmiş taraması: ' + s.name, txt, true);
    await UI.say(who, `${s.name}: ${txt}`);
  }
  if (list.length) UI.toast('Geçmiş tarama sonuçları dosyaya eklendi.', 'good');
};

G.talkKevin = async function (who) {
  const nt = G.nextTask();
  const st = G.state;
  if (st.status === 'pending') return UI.say(who, 'Şef seni bekliyor. Ofisinde. Ben olsam acele ederdim.');
  if (!nt || st.status === 'closed') return UI.say(who, 'İyi iş çıkardın. Yarın yine görürüz.');
  const lines = [
    `Ben olsam şuna bakardım: ${nt.t}. Yer: ${nt.where}.`,
    nt.hint || 'Olay yerindeki izleri şüphelilerin özellikleriyle tek tek karşılaştır. Biri hepsine uymuyorsa, o değildir.',
  ];
  await UI.lines(who, lines);
};

G.talkRay = async function (who) {
  const tips = [
    'Şüphelileri sorguda “okuyunca” elini, sigarasını, parfümünü öğreniyorsun. Grace de ayakkabı numarasını ve aracını bulur.',
    'Olay yerinde bir şey bulamıyorsan Q’ya bas. Senin o “gözlem” numaran işe yarıyor, kabul.',
    'Mazeretleri kafe, otel ve bardakilere sor. Ama önce şüpheliye nerede olduğunu sorman lazım.',
    'Kafede Mia’nın çayları odağını tazeler. Karakolun mutfağında da çay var, bedava!',
    'Çok geç kalma. Geçen sefer gece ikide seni kanepeye ben taşıdım.',
    'Herkes bir şey saklar, Jade. Ama herkes katil değildir.',
  ];
  await UI.say(who, tips[Math.floor(Math.random() * tips.length)]);
};

G.talkOrtiz = async function (who) {
  const st = G.state, c = st.case, k = st.k;
  if (!c || !G.active()) return UI.say(who, 'Bugün morg sessiz. Bu iyiye işaret, değil mi?');
  if (k.autopsy) {
    const a = k.evidence.find((e) => e.id === 'autopsy');
    return UI.say(who, 'Raporum dosyanda: ' + (a ? a.text : ''));
  }
  const M = DATA.METHODS[c.method];
  await UI.say(who, 'Jade. Cesedi inceledim. Ama önce senin ne düşündüğünü duymak istiyorum; ne de olsa her şeyi bilen sensin.');
  const r = U.rng(c.seed + 5);
  const wrong = r.shuffle(DATA.METHOD_KEYS.filter((m) => m !== c.method)).slice(0, 2);
  const opts = r.shuffle([c.method].concat(wrong));
  for (;;) {
    const i = await UI.choose(who, `Bulgular: ${M.findings} Sence ölüm nedeni ne?`, opts.map((m) => DATA.METHODS[m].label));
    G.advance(10);
    if (opts[i] === c.method) break;
    G.state.focus = Math.max(0, G.state.focus - 5);
    SFX.bad();
    await UI.say(who, 'Hayır. Bulgulara bir daha bak; hepsi bir şey söylüyor. (−5 odak)');
  }
  await UI.say(who, 'Doğru. Şimdi ölüm saati.');
  const h = c.tod;
  const wins = r.shuffle([h - 2, h, h + 2]);
  for (;;) {
    const i = await UI.choose(who, `Ceset sabah 06.00’da bulundu. Vücut ısısı ${c.bodyTemp.toFixed(1).replace('.', ',')}°C idi. Normali 37°C; bu koşullarda ceset saatte yaklaşık 1°C soğur. Ölüm hangi aralıkta?`,
      wins.map((w) => `${U.hm(w)} – ${U.hm(w + 1)}`));
    G.advance(10);
    if (wins[i] === h) break;
    G.state.focus = Math.max(0, G.state.focus - 5);
    SFX.bad();
    await UI.say(who, 'Tutmuyor. 37’den çıkar, saat başına bir derece... Geriye doğru say. (−5 odak)');
  }
  const handNote = c.sceneAttrs.includes('hand') ? ' ' + M.handText(c.culpritVals.hand === 'sol') : (M.hand ? ' Saldırganın hangi elini kullandığını kestiremiyorum.' : '');
  const text = `Ölüm nedeni: ${M.label}. Ölüm saati: ${U.hm(h)} – ${U.hm(h + 1)}.${handNote} Olası silah/yöntem: ${c.weapon}.`;
  await UI.say(who, 'Mükemmel. ' + text);
  k.autopsy = true;
  G.advance(25);
  G.addEvidence('autopsy', 'Otopsi raporu', text);
  SFX.good();
};

G.talkSam = async function (who) {
  const c = G.state.case, k = G.state.k;
  if (!c || !G.active() || !c.feats.print) return UI.say(who, 'Mikroskobum hazır. Ama bu davada bana getirebileceğin bir iz yok gibi.');
  if (!k.found.print) return UI.say(who, 'Olay yerinden bir parmak izi getirirsen, şüphelilerin kayıtlı izleriyle karşılaştırırız.');
  if (k.print) return UI.say(who, 'Parmak izi sonucu dosyanda. Kısmi iz iki kişiye uyuyordu, hatırlarsın.');
  await UI.say(who, 'Kadehteki iz kısmi; tek başına kimseyi göstermez. Şüphelilerin kayıtlı izlerinde bu deseni arayalım. Hepsini bulmalısın, çünkü bu desen birden fazla kişide olabilir.');
  const ok = await MINI.fingerprint(c);
  G.advance(30);
  if (ok) {
    k.print = true;
    const names = c.print.matches.map((id) => G.sus(id).name).join(' ve ');
    G.addEvidence('print', 'Parmak izi analizi', `Kadehteki kısmi iz şu kişilerin kayıtlı izleriyle uyumlu: ${names}. (Kısmi iz olduğundan ikisi de mümkün.)`);
    SFX.good();
    await UI.say(who, `Tamamdır: ${names}. İkisinden biri o kadehe dokunmuş.`);
  } else await UI.say(who, 'Sonra tekrar bakalım. İz bir yere kaçmıyor.');
};

G.witnessShop = {
  mia: [{ label: 'Bergamot çayı', price: 6, focus: 30 }, { label: 'Limonlu kurabiye', price: 3, focus: 12 }],
  lou: [{ label: 'Zencefilli gazoz', price: 4, focus: 16 }],
  hector: [],
};
G.witnessGreet = {
  mia: 'Jade! Her zamanki bergamot mu? Yoksa yine birilerini mi soruyorsun?',
  hector: 'Grand Palmiye’ye hoş geldiniz, efendim. Misafir defterimiz her zaman polise açıktır... şey, danışmana da.',
  lou: 'Danışman! Sert bir şey mi, yoksa yine soru mu?',
};

G.talkWitness = async function (id, who) {
  const place = { mia: 'cafe', hector: 'hotel', lou: 'bar' }[id];
  for (;;) {
    const st = G.state, c = st.case, k = st.k;
    const ask = c && G.active() ? c.suspects.filter((s) => s.alibi.place === place && k.sus[s.id].alibi && !k.sus[s.id].checked) : [];
    const opts = [];
    for (const it of G.witnessShop[id]) opts.push({ label: `${it.label} ($${it.price}, +${it.focus} odak)`, it });
    for (const s of ask) opts.push({ label: `${s.name} o gece burada mıydı?`, s });
    opts.push({ label: 'Hoşça kal.' });
    const i = await UI.choose(who, G.witnessGreet[id], opts);
    const o = opts[i];
    if (o.it) {
      if (st.money < o.it.price) { SFX.bad(); await UI.say(who, 'Hesabı karakola mı yazayım? Şaka şaka... ama paran yetmiyor.'); continue; }
      st.money -= o.it.price; G.gainFocus(o.it.focus); G.advance(10); SFX.good();
      await UI.say(null, `Jade ${o.it.label.toLowerCase()} keyfini çıkarıyor. (+${o.it.focus} odak)`);
      continue;
    }
    if (o.s) {
      G.advance(10);
      const s = o.s;
      k.sus[s.id].checked = true;
      await UI.say(who, s.alibi.truth);
      G.addEvidence('alibi_' + s.id, 'Mazeret kontrolü: ' + s.name, `${G.place(place).name} çalışanı: “${s.alibi.truth}”`);
      continue;
    }
    return;
  }
};

G.talkNeighbor = async function (who) {
  const c = G.state.case, k = G.state.k;
  await UI.say(who, 'Siz polis misiniz? Ah, danışman. Neyse, birine anlatmam lazımdı.');
  await UI.say(who, c.neighbor.text);
  if (!k.neighbor) {
    k.neighbor = true;
    G.advance(10);
    G.addEvidence('neighbor', 'Komşunun ifadesi', c.neighbor.text);
  }
};

G.talkSuspect = async function (s, who) {
  const k = G.state.k, ks = k.sus[s.id];
  const jade = G.cast('jade');
  if (!ks.met) {
    ks.met = true;
    await UI.say(who, `${s.name}. Kurbanın ${s.relation}. Siz de... polis misiniz?`);
    await UI.say(jade, 'Danışmanım. Polisler daha sıkıcı. Birkaç sorum olacak.');
    G.addEvidence('met_' + s.id, 'Tanıştın: ' + s.name, `Kurbanın ${s.relation}. Bulunduğu yer: ${G.place(s.loc).name}. Saç: ${s.attrs.hair}.`, true);
  }
  for (;;) {
    const opts = [
      { label: (ks.motive ? '✓ ' : '') + 'Kurbanla aranız nasıldı?' },
      { label: (ks.alibi ? '✓ ' : '') + 'Olay gecesi neredeydiniz?' },
      { label: (ks.gossip ? '✓ ' : '') + 'Sizce bunu kim yapmış olabilir?' },
      { label: ks.read ? '✓ Onu zaten okudun' : '[Gözlem • 15 odak] Onu oku', disabled: ks.read },
      { label: 'Şimdilik bu kadar.' },
    ];
    const i = await UI.choose(who, 'Başka?', opts);
    if (i === 0) {
      G.advance(10);
      await UI.say(who, DATA.MOTIVES[s.motive].say);
      if (!ks.motive) { ks.motive = true; G.addEvidence('mot_' + s.id, 'İfade: ' + s.name, `Kurbanla ilişkisi hakkında: “${DATA.MOTIVES[s.motive].say}”`, true); }
    } else if (i === 1) {
      G.advance(10);
      await UI.say(who, s.alibi.claim);
      if (!ks.alibi) { ks.alibi = true; G.addEvidence('ali_' + s.id, 'Mazeret: ' + s.name, `“${s.alibi.claim}”`, true); }
    } else if (i === 2) {
      G.advance(10);
      const t = G.sus(s.gossipAbout);
      const line = DATA.MOTIVES[t.motive].gossip(t.name);
      await UI.say(who, line);
      if (!ks.gossip) { ks.gossip = true; k.sus[t.id].heard.push(`${s.name}: “${line}”`); }
    } else if (i === 3) {
      await G.coldRead(s, who);
    } else return;
  }
};

G.coldRead = async function (s, who) {
  const k = G.state.k, ks = k.sus[s.id];
  if (!G.useFocus(15)) return;
  SFX.focus(); G.observeFx = 1;
  G.advance(15);
  const a = s.attrs;
  const handTxt = a.hand === 'sol' ? 'Bardağı SOL eliyle tutuyor; not alırken de sol elini kullanıyor. Solak.' : 'Bardağı sağ eliyle tutuyor, imza atarken de sağını kullanıyor.';
  const smokeTxt = a.smoke === DATA.ATTRS.smoke.none ? 'Parmaklarında sigara sarısı yok, üstü sigara kokmuyor: içmiyor.' : `Ceket cebinden bir paket ${a.smoke} görünüyor.`;
  const scentTxt = a.scent === DATA.ATTRS.scent.none ? 'Belirgin bir parfüm kokusu yok.' : `Üzerinden hafif bir ${a.scent} kokusu geliyor.`;
  await UI.say(null, `Jade, ${s.first} adlı şüpheliyi dikkatle süzüyor...`);
  await UI.lines(null, [handTxt, smokeTxt, scentTxt]);
  ks.read = true;
  G.addEvidence('obs_' + s.id, 'Gözlem: ' + s.name, `${handTxt} ${smokeTxt} ${scentTxt}`, true);
  UI.toast(`${s.name}: el, sigara ve koku bilgileri dosyaya eklendi.`, 'good');
  const rd = s.read;
  await UI.say(null, 'Jade bir ayrıntı daha fark ediyor: ' + rd.obs);
  const r = U.rng(G.state.case.seed + s.id.charCodeAt(1));
  const opts = r.shuffle([rd.right].concat(rd.wrong));
  const i = await UI.choose(G.cast('jade'), '(İçinden) Bu ne anlama geliyor?', opts);
  if (opts[i] === rd.right) {
    ks.readOk = true;
    SFX.good();
    await UI.say(G.cast('jade'), `${rd.right}... Değil mi? Yüzünüzden okunuyor.`);
    await UI.say(who, rd.secret);
    let txt = `“${rd.secret}”`;
    if (rd.altAlibi && rd.alt) { await UI.say(who, rd.alt); txt += ` Gerçek mazereti: “${rd.alt}”`; }
    G.addEvidence('read_' + s.id, (rd.trace ? 'İtiraf: ' : 'Sır: ') + s.name, (rd.trace ? 'Olay yerine gittiğini kabul etti. ' : '') + txt);
    G.gainFocus(5);
  } else {
    SFX.bad();
    await UI.say(G.cast('jade'), `${opts[i]}... Değil mi?`);
    await UI.say(who, 'Ne? Saçmalık. Bence fazla televizyon izliyorsunuz.');
    await UI.say(null, 'Yanlış okuma. Şüpheli savunmaya geçti; bu konuda daha fazla bir şey söylemeyecek.');
  }
};

// ============================================================ Olay yeri
G.sceneArrival = async function () {
  if (UI.busy()) return;
  G.scripting = true;
  const c = G.state.case;
  await UI.say(null, `${G.place(c.scene).name}. Olay yeri bantlarla çevrili. Yerdeki parıltılara yaklaşıp E ile incele.`);
  await UI.say(G.cast('jade'), 'Gözle görülenler başlangıç. Asıl ilginç olanlar saklananlardır. (Q: Gözlem)');
  G.scripting = false;
};

G.pickClue = async function (cl) {
  const k = G.state.k, c = G.state.case;
  k.found[cl.id] = true;
  SFX.clue();
  G.advance(5);
  await UI.say(null, `${cl.title}: ${cl.text}`);
  G.addEvidence('clue_' + cl.id, cl.title, cl.text);
  if (cl.id === 'cipher') {
    const i = await UI.choose(G.cast('jade'), 'Kaydırma şifresi... Şimdi çözmeye çalışayım mı?', ['Evet, hemen bakalım.', 'Sonra (Dosya → Deliller).']);
    if (i === 0) await G.solveCipher();
  }
  if (c.clues.every((x) => k.found[x.id])) { UI.toast('Olay yerindeki tüm ipuçlarını buldun!', 'good'); SFX.good(); }
};

G.solveCipher = async function () {
  const c = G.state.case, k = G.state.k;
  if (k.cipher) return;
  const ok = await MINI.cipher(c);
  G.advance(20);
  if (ok) {
    k.cipher = true;
    G.addEvidence('cipher_done', 'Çözülen not', `“${c.cipher.plain}” Notu imzalayan kişinin adı ${c.cipher.initial} harfiyle başlıyor.`);
    SFX.good();
    await UI.say(G.cast('jade'), `“-${c.cipher.initial}.” Katil kurbanı buluşmaya çağırmış. Adı ${c.cipher.initial} ile başlayan biri...`);
  }
};

G.openSafe = async function () {
  const c = G.state.case, k = G.state.k;
  if (k.safe) return UI.say(null, 'Kasa açık ve boş. İçindeki defter artık dosyanda.');
  await UI.say(null, 'Duvara gömülü küçük bir kasa. Kurbanın masasında, kasa şifresine dair karalamalar olan bir not kâğıdı var.');
  const ok = await MINI.safe(c);
  G.advance(20);
  if (ok) {
    k.safe = true;
    SFX.good();
    const txt = c.safe.doc.map((d) => '• ' + d).join(' ');
    await UI.say(null, 'Klik! Kasa açıldı. İçinde kurbanın gizli defteri var. Son sayfada:');
    for (const d of c.safe.doc) await UI.say(null, '“' + d + '”');
    G.addEvidence('safe', 'Kurbanın gizli defteri', txt);
  }
};

// ============================================================ Mekân eylemleri
G.useAct = async function (act) {
  const st = G.state;
  if (act === 'car') return G.drive();
  if (act === 'couch') return G.couch();
  if (act === 'tea') {
    if (st.tea >= 2) return UI.say(G.cast('jade'), 'Bugün yeterince çay içtim. Sanırım. Hayır, aslında asla yeterli değil... ama demlik boş.');
    st.tea++; G.gainFocus(20); G.advance(15); SFX.good();
    return UI.say(null, 'Jade kendine özenle bir fincan çay demliyor. Fincan, tabak, tam üç dakika demleme. (+20 odak)');
  }
  if (act === 'board') {
    const i = await UI.choose(null, 'Delil panosu: kırmızı ipler, fotoğraflar, notlar.', ['Dava dosyasını aç', 'Vazgeç']);
    if (i === 0) DOSSIER.open('suspects');
    return;
  }
  if (act === 'computer') return G.talkGrace(G.cast('grace'));
  if (act === 'autopsy') return G.talkOrtiz(G.cast('ortiz'));
  if (act === 'printlab') return G.talkSam(G.cast('sam'));
};

G.drive = async function () {
  const dests = WORLD.BUILDINGS.map((b) => b.id);
  const c = G.state.case;
  const opts = dests.map((id) => G.place(id).name + (c && G.active() && c.scene === id ? ' (olay yeri)' : '') + (c && G.active() && c.suspects.some((s) => s.loc === id) ? ' (şüpheli)' : ''));
  opts.push('Vazgeç');
  const i = await UI.choose(G.cast('jade'), 'Eski dostum. Nereye gidiyoruz? (20 dk)', opts);
  if (i >= dests.length) return;
  const b = WORLD.building(dests[i]);
  G.advance(20);
  G.enterMap('town', b.door.x, b.door.y + 1, 1);
};

G.couch = async function () {
  const st = G.state;
  const night = st.time >= 20 * 60;
  const opts = [];
  if (night) opts.push('Uyu (günü bitir)');
  opts.push('Kısa bir şekerleme (2 saat, +40 odak)');
  opts.push('Vazgeç');
  const i = await UI.choose(null, night ? 'Jade’in emektar deri kanepesi. Gece oldu.' : 'Jade’in emektar deri kanepesi.', opts);
  const label = opts[i];
  if (label.startsWith('Uyu')) return G.newDay(false);
  if (label.startsWith('Kısa')) {
    G.fade = 1; G.advance(120); G.gainFocus(40); SFX.good();
    return UI.say(null, 'Jade gözlerini kapatıyor... ve iki saat sonra, zihni berrak, uyanıyor. (+40 odak)');
  }
};

// ============================================================ Gün geçişi
G.faint = function () {
  if (G.fainting) return;
  G.fainting = true;
  G.state.money = Math.max(0, G.state.money - 15);
  G.newDay(true).then(() => { G.fainting = false; });
};

G.newDay = async function (fainted) {
  const st = G.state;
  G.scripting = true;
  st.day += 1;
  st.time = 8 * 60;
  st.tea = 0;
  st.focus = fainted ? Math.round(st.maxFocus * 0.6) : st.maxFocus;
  const sp = WORLD.INTERIORS.station.spawn;
  G.enterMap('station', sp[0], sp[1], 0);
  G.fade = 1.5;
  UI.dlg = null; UI.renderDlg();
  await UI.say(null, fainted
    ? `Jade gece yorgunluktan bayıldı. Ray onu karakoldaki kanepeye taşıdı ve taksi parasını cüzdanından aldı (−$15). Gün ${st.day} • ${G.dayName()}.`
    : `Jade kanepesinde derin bir uykuya dalıyor... Gün ${st.day} • ${G.dayName()}, sabah 08.00.`);
  if (st.status === 'active' && st.day > st.deadline) {
    const c = st.case;
    st.failed += 1;
    st.rep = Math.max(0, st.rep - 2);
    const culprit = c.suspects.find((s) => s.role === 'C');
    st.history.push({ num: c.num, title: c.title, stars: 0, result: 'Zaman aşımı', culprit: culprit.name, day: st.day });
    st.status = 'closed';
    SFX.bad();
    await UI.say(G.cast('boss'), `Jade. ${c.title} dosyası başsavcılığa gitti; süremiz doldu. Dava faili meçhul kaldı. Bu iyi olmadı. (İtibar −2)`);
    await UI.say(null, `(Sonradan anlaşıldı ki katil ${culprit.name} idi.)`);
  }
  if (st.status === 'closed' || !st.case) {
    G.newCase();
    await UI.say(G.cast('boss'), 'Jade! Masamda yeni bir dosya var. Ofisime gel.');
  }
  G.npcs = G.npcsFor(G.map.id);
  G.save();
  G.scripting = false;
};

// ============================================================ Suçlama
G.accuse = async function (who) {
  const st = G.state, c = st.case, k = st.k;
  const res = await MINI.accuse(c, k);
  if (!res) { await UI.say(who, 'Emin olduğunda gel. Yanlış kişiyi suçlarsak başımız yanar.'); return; }
  G.advance(30);
  const culprit = c.suspects.find((s) => s.role === 'C');
  const accused = G.sus(res.suspect);
  const jade = G.cast('jade');
  if (accused.id !== culprit.id) {
    k.wrong += 1;
    st.rep = Math.max(0, st.rep - 1);
    SFX.bad();
    await UI.say(G.cast('jade'), `Katil... ${accused.name}!`);
    await UI.say({ name: accused.name, spec: accused.spec }, 'Ne?! Avukatımı istiyorum. Hemen!');
    if (k.wrong >= 2) {
      st.failed += 1; st.rep = Math.max(0, st.rep - 2);
      st.history.push({ num: c.num, title: c.title, stars: 0, result: 'Başarısız', culprit: culprit.name, day: st.day });
      st.status = 'closed';
      await UI.say(who, `${accused.name} da masum çıktı. Bu davadan alındın, Jade. Başsavcı küplere bindi. (İtibar −3)`);
      await UI.say(null, `(Gerçek katil ${culprit.name} idi. ${G.explainShort(c)})`);
      G.save();
      return;
    }
    await UI.say(who, `${accused.name} masum çıktı; elimizdeki deliller tutmuyor. Bir hakkın daha var, Jade. Dikkatli ol. (İtibar −1)`);
    return;
  }
  const methodOk = res.method === c.method, motiveOk = res.motive === culprit.motive;
  const stars = 1 + (methodOk ? 1 : 0) + (motiveOk ? 1 : 0);
  // Jade'in açıklaması
  await UI.say(jade, 'Hepiniz bir yalan söylediniz. Ama yalnızca biriniz cinayet işledi.');
  for (const line of G.explain(c)) await UI.say(jade, line);
  await UI.say(jade, `Bunların hepsine uyan tek kişi: ${culprit.name}.`);
  await UI.say({ name: culprit.name, spec: culprit.spec }, CONFESS[culprit.motive]);
  SFX.good();
  const pay = 40 + stars * 40 - k.wrong * 20;
  const repGain = stars * 2 + (st.day <= st.deadline - 2 ? 1 : 0);
  st.money += pay; st.rep += repGain; st.solved += 1;
  st.maxFocus = Math.min(160, st.maxFocus + 5);
  st.history.push({ num: c.num, title: c.title, stars, result: 'Çözüldü', culprit: culprit.name, day: st.day });
  st.status = 'closed';
  const notes = [];
  if (!methodOk) notes.push(`yöntem aslında “${DATA.METHODS[c.method].label}”`);
  if (!motiveOk) notes.push(`motif aslında “${DATA.MOTIVES[culprit.motive].label}”`);
  await UI.say(who, `Harika iş, Jade. ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}${notes.length ? ' (Ama ' + notes.join(', ') + '.)' : ''} Prim: $${pay}, itibar +${repGain}, maksimum odak +5.`);
  await UI.say(who, 'Şimdi git dinlen. Yarın yeni dosya gelir.');
  await MINI.rankCheck();
  G.save();
};

// Olay yeri profilinden kimin elendiğini anlatan cümleler
G.explain = function (c) {
  const out = [];
  const label = { shoe: 'ayak izi', smoke: 'izmarit', hair: 'saç teli', scent: 'koku', hand: 'darbe açısı', vehicle: 'komşunun gördüğü araç' };
  for (const key of c.sceneAttrs) {
    const v = c.culpritVals[key];
    const fit = c.suspects.filter((s) => s.attrs[key] === v).map((s) => s.first);
    const vtxt = key === 'hand' ? (v === 'sol' ? 'solak bir saldırgan' : 'sağ elini kullanan bir saldırgan') : DATA.ATTRS[key].fmt(v);
    out.push(`Olay yerindeki ${label[key]}: ${vtxt}. Bu yalnızca ${fit.join(', ')} için geçerli.`);
  }
  const C = c.suspects.find((s) => s.role === 'C');
  if (C.alibi.place) out.push(`Üstelik ${C.first}, mazeret verdiği yerden ölüm saatinden hemen önce ayrılmıştı.`);
  return out;
};
G.explainShort = (c) => {
  const C = c.suspects.find((s) => s.role === 'C');
  return c.sceneAttrs.map((k) => `${DATA.ATTRS[k].label}: ${DATA.ATTRS[k].fmt(C.attrs[k])}`).join(', ');
};

window.addEventListener('load', G.init);
