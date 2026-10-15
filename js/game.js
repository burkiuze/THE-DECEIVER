'use strict';
// Oyun motoru: durum, döngü, girdi, kamera, çizim, NPC simülasyonu, gün geçişi.

const G = {
  state: null, map: null, npcs: [], keys: {}, touch: { x: 0, y: 0 },
  player: { x: 0, y: 0, dir: 0, moving: false, anim: 0 },
  cam: { x: 0, y: 0 }, S: 3, dpr: 1, t: 0, fade: 0, revealed: false, observeFx: 0,
  running: false, saveKey: 'the-deceiver-save-v2', fx: [], birds: [],
};

const MIN_PER_SEC = 10 / 7;
const SPEED = 74, RUN = 118;
const CAST_AT = { station: ['boss', 'grace', 'kevin', 'ray'], lab: ['ortiz', 'sam'], cafe: ['mia'], hotel: ['hector'], bar: ['lou'] };

// ============================================================ Başlatma
G.init = function () {
  G.canvas = document.getElementById('game');
  G.ctx = G.canvas.getContext('2d');
  G.lightC = document.createElement('canvas');
  G.lightG = G.lightC.getContext('2d');
  UI.init();
  WORLD.init();
  G.spark = [0, 1, 2, 3].map((k) => makeSpark(k, '#fff6b0'));
  G.sparkH = [0, 1, 2, 3].map((k) => makeSpark(k, '#c9a6ff'));
  window.addEventListener('resize', G.resize);
  G.resize();
  G.bindInput();
  G.showTitle();
  requestAnimationFrame(G.loop);
};

function makeSpark(k, col) {
  const [c, g] = ART.canvas(16, 16);
  const s = [3, 5, 6, 5][k];
  g.fillStyle = col; g.fillRect(8 - s, 7, s * 2, 2); g.fillRect(7, 8 - s, 2, s * 2);
  g.fillStyle = '#fff'; g.fillRect(7, 7, 2, 2);
  return c;
}

G.resize = function () {
  G.dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  G.canvas.width = Math.floor(w * G.dpr); G.canvas.height = Math.floor(h * G.dpr);
  G.canvas.style.width = w + 'px'; G.canvas.style.height = h + 'px';
  const base = Math.max(2, Math.floor(Math.min(w / (16 * 26), h / (16 * 15))));
  G.S = base * G.dpr;
  G.lightC.width = G.canvas.width; G.lightC.height = G.canvas.height;
  G.ctx.imageSmoothingEnabled = false;
};

// ============================================================ Başlık
G.showTitle = function () {
  const t = document.getElementById('title');
  t.classList.remove('hidden');
  let has = false;
  try { has = !!localStorage.getItem(G.saveKey); } catch (e) { /* depolama kapalı */ }
  const btns = document.getElementById('title-btns');
  btns.innerHTML = '';
  if (has) btns.appendChild(U.h('button', { class: 'big', onclick: () => G.start(false) }, 'Devam Et'));
  const nb = U.h('button', { class: 'big' + (has ? ' alt' : '') }, 'Yeni Oyun');
  nb.addEventListener('click', () => {
    if (!has || nb.dataset.confirm) return G.start(true);
    nb.dataset.confirm = '1'; nb.textContent = 'Kayıt silinecek — onaylamak için tekrar tıkla';
  });
  btns.appendChild(nb);
  btns.appendChild(U.h('button', { class: 'big alt', onclick: G.howTo }, 'Nasıl Oynanır?'));
  ART.portrait(document.getElementById('title-jade'), DATA.CAST.jade.spec);
};

G.howTo = function () {
  UI.modal({
    title: 'Nasıl Oynanır?', wide: true,
    build(b) {
      b.innerHTML = `
      <p>Sen <b>Jade</b>’sin: SSB Karakolu’nun gözü her şeyi gören danışmanı. Sunset Koyu’nda 150’den fazla insan yaşıyor; hepsinin bir evi, işi, günlük programı ve sırları var.</p>
      <h3>Kontroller</h3>
      <ul>
        <li><b>WASD / Ok tuşları</b>: yürü (<b>Shift</b> koş) • <b>E / Boşluk</b>: konuş, incele • <b>Q</b>: Gözlem • <b>F / Tab</b>: Dosya • <b>M</b>: ses</li>
      </ul>
      <h3>Dedektiflik</h3>
      <ul>
        <li><b>Cesetler</b>: cesede yaklaş ve E’ye bas; ceplerini ara. Bazı eşyalar ancak dikkatle (odak harcayarak) aranınca çıkar.</li>
        <li><b>İzler</b>: olay yerindeki ayak izi, saç teli, izmarit, koku katilin profilini çıkarır. İnsanları <b>okuyarak</b> (el, sigara, koku) ve Grace’in kayıtlarıyla (ayakkabı, araç) karşılaştır.</li>
        <li><b>Gizli odalar</b>: bazı evlerde kitaplık ya da gardırop arkasında gizli oda vardır. Gözlem (Q) açıkken parıldar.</li>
        <li><b>Seri katil</b>: yakalanana kadar her iki gecede bir öldürür. Her ölüm yeni bir iz bırakır; ölü sayısı arttıkça katile yaklaşırsın.</li>
        <li><b>Lion Lion</b>: yozlaşmış bir CIA-FBI ağı. Kimse kimseyi tanımaz, emir yukarıdan gelir. Ölü noktaları gözetle, üyeleri tek tek ifşa et.</li>
        <li><b>Yellow Bea</b>: seni katil göstermeye çalışan dâhi. Şüphe göstergen 100 olursa tutuklanırsın. Tanıklarla mazeretini kanıtla, sahte delilleri çürüt.</li>
      </ul>`;
    },
  });
};

G.start = function (fresh) {
  SFX.ensure();
  document.getElementById('title').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  let loaded = null;
  if (!fresh) { try { loaded = JSON.parse(localStorage.getItem(G.saveKey)); } catch (e) { loaded = null; } }
  if (loaded && loaded.v === 2) {
    G.state = loaded;
    POP.generate(G.state.seed);
    G.applyPopState();
    G.enterMap(G.state.map, null, null, G.state.dir, true);
    G.player.x = G.state.px; G.player.y = G.state.py;
    G.snapCam();
    G.running = true;
    UI.toast(`Gün ${G.state.day} • ${G.dayName()} • ${U.fmt(G.state.time)}`);
    return;
  }
  const seed = (Date.now() % 1000000) + 17;
  G.state = {
    v: 2, seed, day: 1, time: 8 * 60, money: 60, focus: 100, maxFocus: 100, rep: 0, solved: 0, failed: 0, tea: 0,
    map: 'station', px: 0, py: 0, dir: 0, caseNum: 0, current: null, cases: {}, scenes: {}, serial: null,
    pop: {}, popFix: {}, know: {}, evidence: [], history: [], jlog: {}, talked: [], weather: 'clear',
  };
  POP.generate(seed);
  STORY.init(G.state);
  G.newStandardCase();
  const sp = WORLD.INTERIORS.station.spawn;
  G.enterMap('station', sp[0], sp[1], 0, true);
  G.running = true;
  G.runScript(G.intro);
};

G.intro = async function () {
  await UI.say(null, `${DATA.TOWN}, Kaliforniya. Nüfus: ${POP.people.length + 11}. SSB Karakolu. Sabah saat 08.00.`);
  await UI.say(G.cast('jade'), 'Bu kanepe kasabadaki en iyi düşünme yeri. Bir de en iyi uyuma yeri.');
  await UI.say(G.cast('boss'), 'JADE! Kanepeden kalk. Masamda yeni bir dosya var. Ofisime gel!');
  await UI.say(null, 'İpucu: Şef Lena sağdaki ofiste. Yürü ve E ile konuş. Dava dosyası için F. Şehir büyük; karakolun önündeki arabanla her yere gidebilirsin.');
};

// ============================================================ Yardımcılar
G.cast = (id) => ({ name: DATA.CAST[id].name, spec: DATA.CAST[id].spec });
G.dayName = (d) => DATA.DAYS[((d || G.state.day) - 1) % 7];
G.place = (id) => DATA.PLACES[id] || { name: id, short: id };
G.pwho = (p) => ({ name: p.name, spec: p.spec });
G.know = function (pid) { const k = G.state.know; return (k[pid] = k[pid] || { met: false, read: false, bg: false }); };
G.curCase = () => (G.state.current ? G.state.cases[G.state.current] : null);
G.activeCase = () => { const c = G.curCase(); return c && c.status === 'active' ? c : null; };

G.save = function () {
  if (!G.state || !G.map) return;
  G.state.px = G.player.x; G.state.py = G.player.y; G.state.dir = G.player.dir; G.state.map = G.map.id;
  try { localStorage.setItem(G.saveKey, JSON.stringify(G.state)); } catch (e) { /* kayıt alanı yok */ }
};

G.applyPopState = function () {
  for (const [pid, fix] of Object.entries(G.state.popFix || {})) Object.assign(POP.get(pid).attrs, fix);
  for (const [pid, ps] of Object.entries(G.state.pop || {})) { const p = POP.get(pid); if (p) Object.assign(p, ps); }
};
G.popState = function (pid) { return (G.state.pop[pid] = G.state.pop[pid] || {}); };
G.killPerson = function (pid) { const p = POP.get(pid); p.alive = false; G.popState(pid).alive = false; };
G.jail = function (pid) { const p = POP.get(pid); p.jailed = true; G.popState(pid).jailed = true; G.state.jailedOrder = (G.state.jailedOrder || []).concat([pid]); };
G.overridePerson = function (pid, day, from, to, place) {
  if (place.startsWith('near:')) {
    const pl = place.slice(5);
    const sc = Object.values(G.state.scenes).find((s) => s.place === pl && s.map === 'town' && !s.closed);
    const b = WORLD.building(pl);
    let x, y;
    if (b) { x = b.door.x + 2; y = b.door.y + 1; }
    else if (sc) { x = sc.body[0] + 2; y = sc.body[1] + 1; }
    else { const sp = WORLD.maps.town.spots.parkCenter; x = sp[0]; y = sp[1]; }
    const m = WORLD.maps.town;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [2, 0], [-2, 0], [0, -1], [3, 1], [-3, 1]]) if (!WORLD.isSolid(m, x + dx, y + dy)) { x += dx; y += dy; break; }
    place = 'at:' + x + ',' + y;
  }
  const o = { from: (day - 1) * 1440 + from, to: (day - 1) * 1440 + to, place };
  const ps = G.popState(pid);
  ps.overrides = (ps.overrides || []).concat([o]);
  POP.get(pid).overrides = ps.overrides;
};

G.addEvidence = function (caseId, id, title, text, silent) {
  const ev = G.state.evidence;
  if (ev.some((e) => e.id === id)) return;
  ev.push({ id, caseId, title, text, day: G.state.day, time: G.state.time });
  if (!silent) UI.toast('Dosyaya eklendi: ' + title, 'good');
};

G.advance = function (min) { G.state.time += min; };
G.useFocus = function (n) {
  if (G.state.focus < n) { UI.toast('Odak yetersiz! Çay iç ya da biraz dinlen.', 'bad'); SFX.bad(); return false; }
  G.state.focus -= n; return true;
};
G.gainFocus = (n) => { G.state.focus = Math.min(G.state.maxFocus, G.state.focus + n); };

G.runScript = async function (fn) {
  if (G.scripting) { G.queued = (G.queued || []).concat([fn]); return; }
  G.scripting = true;
  try { await fn(); } catch (e) { console.error(e); }
  G.scripting = false;
  G.save();
  if (G.queued && G.queued.length) { const next = G.queued.shift(); G.runScript(next); }
};

// Jade'in konum günlüğü (mazeret için)
G.logJade = function () {
  const st = G.state;
  const abs = (st.day - 1) * 1440 + st.time;
  st.jlog[Math.floor(abs / 30)] = G.map.id;
};
G.jadeWitnesses = function (day, minute) {
  const abs = (day - 1) * 1440 + minute;
  const place = G.state.jlog[Math.floor(abs / 30)];
  if (!place || place === 'town' || place.startsWith('secret:')) return [];
  const d = Math.floor(abs / 1440) + 1, m = abs % 1440;
  const out = [];
  for (const p of POP.people) if (POP.where(p, d, m) === place) out.push(p.id);
  return out.concat(CAST_AT[place] || []);
};

// ============================================================ Dava oluşturma
G.newStandardCase = function (opts) {
  const st = G.state;
  st.caseNum += 1;
  const s = st.story;
  const ex = Object.keys(s.members).filter((id) => !(opts && opts.agent === id));
  if (st.serial) ex.push(st.serial.killer);
  let res = null;
  for (let i = 0; i < 6 && !res; i++) res = CASES.genStandard(st.seed * 31 + st.caseNum * 7919 + i * 977, st.caseNum, st.day - 1, Object.assign({ exclude: ex, netMembers: Object.keys(s.members) }, opts || {}));
  if (!res) return;
  st.cases[res.c.id] = res.c;
  st.scenes[res.scene.id] = res.scene;
  st.current = res.c.id;
  G.killPerson(res.c.victim);
  G.overridePerson(res.c.witness.pid, st.day, 8 * 60, 20 * 60, 'near:' + res.scene.place);
  G.overridePerson(res.c.witness.pid, st.day + 1, 8 * 60, 20 * 60, 'near:' + res.scene.place);
};

// ============================================================ Haritalar ve NPC'ler
G.enterMap = function (id, tx, ty, dir, instant) {
  const m = WORLD.getMap(id);
  G.map = m;
  G.revealed = false;
  if (tx != null) { G.player.x = tx * TS + 8; G.player.y = ty * TS + 12; }
  G.player.dir = dir || 0;
  G.npcSlot = -1;
  G.refreshNpcs(true);
  G.snapCam();
  if (!instant) { G.fade = 1; SFX.door(); }
  G.checkSceneArrival();
  G.save();
};

G.checkSceneArrival = function () {
  for (const sc of Object.values(G.state.scenes)) {
    if (sc.map !== G.map.id || sc.visited || sc.closed) continue;
    if (G.map.id === 'town' && Math.hypot(sc.body[0] - G.player.x / TS, sc.body[1] - G.player.y / TS) > 12) continue;
    sc.visited = true;
    setTimeout(() => G.runScript(() => TALK.sceneArrival(sc)), 300);
  }
};

G.mkNpc = function (o) {
  return Object.assign({ dir: 0, anim: 0, moving: false, blinkT: Math.random() * 4 }, o, { x: o.tx * TS + 8, y: o.ty * TS + 12 });
};

G.refreshNpcs = function (force) {
  const st = G.state;
  const slot = Math.floor(((st.day - 1) * 1440 + st.time) / 30);
  if (!force && slot === G.npcSlot) return;
  G.npcSlot = slot;
  const old = new Map(G.npcs.map((n) => [n.id, n]));
  const temps = G.npcs.filter((n) => n.temp);
  G.npcs = G.npcsFor(G.map.id).map((n) => (old.has(n.id) && !force ? Object.assign(n, { x: old.get(n.id).x, y: old.get(n.id).y }) : n)).concat(force ? [] : temps);
};

G.npcsFor = function (id) {
  const L = [];
  const st = G.state;
  const m = WORLD.getMap(id);
  const used = new Set();
  const spotFree = (x, y) => !used.has(x + ',' + y) && !WORLD.isSolid(m, x, y);
  const addAt = (o, x, y) => { used.add(x + ',' + y); L.push(G.mkNpc(Object.assign(o, { tx: x, ty: y }))); };
  for (const cid of CAST_AT[id] || []) { const s = m.spots[cid]; if (s) addAt({ id: cid, name: DATA.CAST[cid].name, spec: DATA.CAST[cid].spec, dir: s[2] }, s[0], s[1]); }
  if (id === 'station') {
    const jailed = (st.jailedOrder || []).slice(-2);
    jailed.forEach((pid, i) => { const p = POP.get(pid); const s = m.spots['cell' + (i + 1)]; if (p && s) addAt({ id: 'p:' + pid, pid, name: p.name + ' (gözaltı)', spec: p.spec, dir: 0, jailedNpc: true }, s[0], s[1]); });
  }
  for (const sc of Object.values(st.scenes)) {
    if (sc.map !== id || sc.closed || id === 'town') continue;
    const opts = m.free.filter(([x, y]) => spotFree(x, y) && !sc.clues.some((c) => c.x === x && c.y === y) && !(y === sc.body[1] && x >= sc.body[0] - 1 && x <= sc.body[0] + 2));
    opts.sort((a, b) => (Math.abs(a[0] - m.door.x - 2) + Math.abs(a[1] - m.h + 3)) - (Math.abs(b[0] - m.door.x - 2) + Math.abs(b[1] - m.h + 3)));
    if (opts[0]) addAt({ id: 'cop', name: DATA.CAST.cop.name, spec: DATA.CAST.cop.spec, dir: 0 }, opts[0][0], opts[0][1]);
  }
  const day = st.day, time = Math.min(st.time, 26 * 60 - 1);
  const town = id === 'town';
  const tm = WORLD.maps.town;
  let townCount = 0;
  const bodyTiles = new Set();
  for (const sc of Object.values(st.scenes)) if (sc.map === id && !sc.closed) { bodyTiles.add(sc.body[0] + ',' + sc.body[1]); bodyTiles.add((sc.body[0] + 1) + ',' + sc.body[1]); }
  for (const p of POP.people) {
    const loc = POP.where(p, day, time);
    if (!loc) continue;
    if (!town) {
      if (loc !== id) continue;
      let pos = null;
      if (p.work === id && m.spots.staff && spotFree(m.spots.staff[0], m.spots.staff[1])) pos = m.spots.staff;
      if (!pos) {
        const fr = m.free.filter(([x, y]) => spotFree(x, y) && !bodyTiles.has(x + ',' + y));
        if (!fr.length) continue;
        pos = fr[U.hash(p.id, day, Math.floor(time / 30)) % fr.length];
      }
      addAt({ id: 'p:' + p.id, pid: p.id, name: p.name, spec: p.spec, dir: U.hash(p.id, time) % 4 }, pos[0], pos[1]);
      continue;
    }
    let anchor = null;
    if (loc.startsWith('at:')) anchor = loc.slice(3).split(',').map(Number);
    else if (loc === 'park') { const sp = WORLD.townSpots('park'); anchor = sp[U.hash(p.id, day, 'pk') % sp.length]; }
    else if (loc === 'lighthouse') anchor = tm.spots.bench;
    else if (loc === 'walk') { const b = WORLD.building(p.home); if (b) anchor = [b.door.x + (U.hash(p.id, day) % 7) - 3, b.door.y + 2]; }
    if (!anchor) continue;
    if (++townCount > 70) continue;
    let [x, y] = anchor;
    for (let k = 0; k < 12 && (!spotFree(x, y) || bodyTiles.has(x + ',' + y)); k++) { x = anchor[0] + (U.hash(p.id, k) % 5) - 2; y = anchor[1] + (U.hash(k, p.id) % 3) - 1; }
    if (!spotFree(x, y)) continue;
    const pinned = loc.startsWith('at:');
    addAt({ id: 'p:' + p.id, pid: p.id, name: p.name, spec: p.spec, dir: 0, home: [anchor[0], anchor[1]], wander: pinned ? null : { t: 1 + Math.random() * 4, tx: null } }, x, y);
  }
  return L;
};

// ============================================================ Girdi
G.bindInput = function () {
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(k) && !typing) e.preventDefault();
    if (typing && k !== 'Escape') return;
    SFX.ensure();
    if (!G.running) return;
    if ((k === 'm' || k === 'M') && !UI.busy()) { SFX.muted = !SFX.muted; UI.toast(SFX.muted ? 'Ses kapalı' : 'Ses açık'); return; }
    if (UI.key(k)) return;
    G.keys[k.toLowerCase()] = true;
    if (e.repeat) return;
    if (k === 'e' || k === 'E' || k === ' ' || k === 'Enter') G.interact();
    else if (k === 'q' || k === 'Q') G.observe();
    else if (k === 'f' || k === 'F' || k === 'Tab') DOSSIER.open();
  });
  window.addEventListener('keyup', (e) => { G.keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { G.keys = {}; });
  const pad = document.getElementById('dpad');
  const knob = document.getElementById('dknob');
  const setDir = (e) => {
    const r = pad.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len < 8) { G.touch.x = 0; G.touch.y = 0; return; }
    G.touch.x = dx / len; G.touch.y = dy / len;
    const kl = Math.min(len, r.width / 2 - 18);
    knob.style.transform = `translate(${(dx / len) * kl}px, ${(dy / len) * kl}px)`;
  };
  const clear = () => { G.touch.x = 0; G.touch.y = 0; knob.style.transform = ''; };
  pad.addEventListener('touchstart', (e) => { e.preventDefault(); setDir(e); }, { passive: false });
  pad.addEventListener('touchmove', (e) => { e.preventDefault(); setDir(e); }, { passive: false });
  pad.addEventListener('touchend', clear); pad.addEventListener('touchcancel', clear);
  const btn = (id, fn) => document.getElementById(id).addEventListener('touchstart', (e) => { e.preventDefault(); SFX.ensure(); if (G.running) fn(); }, { passive: false });
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
    else G.animOnly(dt);
    G.render();
    G.updateHud();
  }
  requestAnimationFrame(G.loop);
};

G.animOnly = function (dt) {
  for (const n of G.npcs) { n.blinkT -= dt; if (n.blinkT < -0.15) n.blinkT = 2 + Math.random() * 4; }
  if (G.fade > 0) G.fade = Math.max(0, G.fade - dt * 3);
  if (G.observeFx > 0) G.observeFx = Math.max(0, G.observeFx - dt);
  G.updateFx(dt);
};

G.update = function (dt) {
  const st = G.state;
  const before = st.time;
  st.time += dt * MIN_PER_SEC;
  if (Math.floor(before / 10) !== Math.floor(st.time / 10)) G.logJade();
  if (st.time >= 26 * 60) { G.runScript(() => G.newDay(true)); return; }
  let mx = 0, my = 0;
  const K = G.keys;
  if (K.a || K.arrowleft) mx -= 1;
  if (K.d || K.arrowright) mx += 1;
  if (K.w || K.arrowup) my -= 1;
  if (K.s || K.arrowdown) my += 1;
  if (!mx && !my) { mx = G.touch.x; my = G.touch.y; }
  const p = G.player;
  const len = Math.hypot(mx, my);
  p.moving = len > 0.2;
  if (p.moving) {
    mx /= len; my /= len;
    if (Math.abs(mx) > Math.abs(my)) p.dir = mx < 0 ? 2 : 3; else p.dir = my < 0 ? 1 : 0;
    const sp = (K.shift ? RUN : SPEED) * dt;
    G.moveBody(p, mx * sp, 0);
    G.moveBody(p, 0, my * sp);
    p.anim += dt * (K.shift ? 11 : 8);
  } else p.anim = 0;
  const tx = Math.floor(p.x / TS), ty = Math.floor((p.y - 3) / TS);
  if (G.map.kind === 'town') {
    const d = G.map.doors.find((dd) => dd.x === tx && dd.y === ty);
    if (d) { const im = WORLD.getMap(d.to); G.enterMap(d.to, im.door.x, im.h - 2, 1); return; }
    G.checkSceneArrival();
  } else if (ty >= G.map.h - 1) {
    if (G.map.secretOf) { const host = WORLD.getMap(G.map.secretOf); const sp = G.state.secretEntry || [host.door.x, host.h - 2]; G.enterMap(G.map.secretOf, sp[0], sp[1], 0); return; }
    const b = WORLD.building(G.map.id);
    G.enterMap('town', b.door.x, b.door.y + 1, 0);
    return;
  }
  for (const n of G.npcs) { if (n.wander) G.updateWalker(n, dt); n.blinkT -= dt; if (n.blinkT < -0.15) n.blinkT = 2 + Math.random() * 4; }
  G.refreshNpcs(false);
  G.followCam(dt);
  if (G.fade > 0) G.fade = Math.max(0, G.fade - dt * 3);
  if (G.observeFx > 0) G.observeFx = Math.max(0, G.observeFx - dt);
  G.updateFx(dt);
  STORY.checkDrops();
  STORY.checkFinal();
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
  for (const sc of Object.values(G.state.scenes)) if (sc.safe && !sc.closed && sc.map === G.map.id && sc.safe.x === tx && sc.safe.y === ty) return true;
  return false;
};

G.moveBody = function (b, dx, dy) {
  const nx = b.x + dx, ny = b.y + dy;
  if (!G.blocked(b, nx, ny)) { b.x = nx; b.y = ny; return true; }
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
      if (!WORLD.isSolid(G.map, tx, ty)) { w.tx = tx * TS + 8; w.ty = ty * TS + 12; w.t = 6; } else w.t = 0.5;
    }
    return;
  }
  const dx = w.tx - n.x, dy = w.ty - n.y;
  const d = Math.hypot(dx, dy);
  if (d < 2 || w.t <= 0) { w.tx = null; w.t = 2 + Math.random() * 5; return; }
  const sp = 30 * dt;
  const mx = dx / d, my = dy / d;
  if (Math.abs(mx) > Math.abs(my)) n.dir = mx < 0 ? 2 : 3; else n.dir = my < 0 ? 1 : 0;
  const okx = G.moveBody(n, mx * sp, 0);
  const oky = G.moveBody(n, 0, my * sp);
  if (!okx && !oky) { w.tx = null; w.t = 1; }
  n.moving = true; n.anim += dt * 6;
};

// Betik içinde bir NPC'yi bir karoya yürüt
G.walkNpc = function (n, tx, ty) {
  return new Promise((res) => {
    const tgtX = tx * TS + 8, tgtY = ty * TS + 12;
    let t = 0;
    const step = () => {
      const dt = 1 / 60;
      t += dt;
      const dx = tgtX - n.x, dy = tgtY - n.y;
      const d = Math.hypot(dx, dy);
      if (d < 2 || t > 6) { n.moving = false; res(); return; }
      const mx = dx / d, my = dy / d;
      n.x += mx * 50 * dt; n.y += my * 50 * dt;
      n.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 2 : 3) : (my < 0 ? 1 : 0);
      n.moving = true; n.anim += dt * 7;
      requestAnimationFrame(step);
    };
    step();
  });
};

G.viewW = () => G.canvas.width / G.S;
G.viewH = () => G.canvas.height / G.S;
G.camTarget = function () {
  const vw = G.viewW(), vh = G.viewH();
  const mw = G.map.w * TS, mh = G.map.h * TS;
  let x = G.player.x - vw / 2, y = G.player.y - 14 - vh / 2;
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

// ============================================================ Ortam efektleri
G.updateFx = function (dt) {
  const st = G.state;
  const h = st.time / 60;
  if (G.map.kind === 'town') {
    if (h > 7 && h < 18 && st.weather === 'clear' && G.birds.length < 4 && Math.random() < dt * 0.15) {
      G.birds.push({ x: G.cam.x - 10, y: G.cam.y + Math.random() * G.viewH() * 0.6, vx: 40 + Math.random() * 20, vy: -4 + Math.random() * 8, t: 0 });
    }
    if (Math.random() < dt * 3) {
      const s = G.map.smoke[Math.floor(Math.random() * G.map.smoke.length)];
      if (s && Math.abs(s.x - G.player.x) < 400 && Math.abs(s.y - G.player.y) < 300) G.fx.push({ kind: 'smoke', x: s.x, y: s.y, vy: -10, vx: 3, life: 3, t: 0 });
    }
    if ((h > 20.5 || h < 5) && st.weather === 'clear' && Math.random() < dt * 2) G.fx.push({ kind: 'fly', x: G.cam.x + Math.random() * G.viewW(), y: G.cam.y + Math.random() * G.viewH(), vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 4, t: 0 });
    if (st.weather === 'rain') for (let i = 0; i < 6; i++) G.fx.push({ kind: 'rain', x: G.cam.x + Math.random() * (G.viewW() + 60), y: G.cam.y - 10, vx: -40, vy: 260, life: 0.8, t: 0 });
  }
  for (const b of G.birds) { b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt; }
  G.birds = G.birds.filter((b) => b.x < G.cam.x + G.viewW() + 20 && b.t < 30);
  for (const f of G.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; }
  G.fx = G.fx.filter((f) => f.t < f.life);
};

// ============================================================ Çizim
G.drawChar = function (ctx, c) {
  const sheet = ART.charSheet(c.spec);
  let frame = c.moving ? [1, 0, 2, 0][Math.floor(c.anim) % 4] : 0;
  if (!c.moving && c.blinkT != null && c.blinkT < 0) frame = 3;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(Math.round(c.x), Math.round(c.y) - 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(sheet.img, frame * sheet.cw, c.dir * sheet.ch, sheet.cw, sheet.ch, Math.round(c.x) - 9, Math.round(c.y) - 33, sheet.cw, sheet.ch);
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
  if (m.kind === 'town') {
    ctx.fillStyle = 'rgba(214,238,248,0.45)';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97 + Math.floor(G.t * 6) * 3) % (m.w * TS)), y = 85 * TS + 6 + (i * 13) % 140;
      ctx.fillRect(x, y, 3, 1);
    }
  }
  const vx0 = cx - 64, vx1 = cx + G.viewW() + 64, vy0 = cy - 64, vy1 = cy + G.viewH() + 110;
  const tape = ART.prop('tape');
  for (const sc of Object.values(G.state.scenes)) {
    if (sc.map !== m.id || sc.closed) continue;
    const bx = sc.body[0] * TS, by = sc.body[1] * TS;
    if (bx < vx0 || bx > vx1 || by < vy0 || by > vy1) continue;
    if (['kunt', 'bicak'].includes(sc.method)) ctx.drawImage(ART.prop('blood'), bx + 2, by + 2);
    if (!sc.autopsy) ctx.drawImage(ART.body(POP.get(sc.victim).spec), bx - 1, by - 1);
    else { ctx.strokeStyle = '#f4f1ea'; ctx.lineWidth = 1; ctx.strokeRect(bx + 1.5, by + 2.5, 28, 11); }
    if (m.kind === 'town') for (let i = -2; i <= 3; i++) { ctx.drawImage(tape, bx + i * 16, by - 22); ctx.drawImage(tape, bx + i * 16, by + 28); }
    let n = 1;
    for (const cl of sc.clues) {
      if (sc.found[cl.id]) { ctx.drawImage(ART.prop('marker'), cl.x * TS + 3, cl.y * TS + 3); ctx.fillStyle = '#222'; ctx.font = 'bold 6px monospace'; ctx.fillText(String(n++), cl.x * TS + 6, cl.y * TS + 11); continue; }
      if (cl.hidden && !G.revealed) continue;
      const f = Math.floor(G.t * 6) % 4;
      ctx.drawImage(cl.hidden ? G.sparkH[f] : G.spark[f], cl.x * TS, cl.y * TS - 2 + Math.sin(G.t * 4) * 1.5);
    }
    if (sc.safe) { const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(sc.safe.x * TS + x, sc.safe.y * TS + y, w, h); }; ART.FURN.safe.draw(R); }
  }
  if (G.revealed && G.map.kind === 'interior' && G.state.secrets[G.map.id]) {
    const f = Math.floor(G.t * 6) % 4;
    for (const [k, a] of Object.entries(G.map.acts)) if (a === 'shelf') { const [x, y] = k.split(',').map(Number); ctx.drawImage(G.sparkH[f], x * TS, y * TS - 4); break; }
  }
  const list = [];
  for (const o of m.objects) {
    if (o.x > vx1 || o.y > vy1 || o.x + o.img.width < vx0 || o.y + o.img.height < vy0) continue;
    list.push(o);
  }
  for (const n of G.npcs) list.push({ base: n.y, npc: n });
  list.push({ base: G.player.y, npc: Object.assign({ spec: DATA.CAST.jade.spec, blinkT: (G.t % 5) < 0.12 ? -0.1 : 1 }, G.player) });
  list.sort((a, b) => a.base - b.base);
  for (const o of list) {
    if (o.npc) G.drawChar(ctx, o.npc);
    else if (o.bob) ctx.drawImage(o.img, Math.round(o.x), Math.round(o.y + Math.sin(G.t * 1.5 + o.x) * 1.2));
    else if (o.kind === 'tree' && G.state.weather !== 'clear') ctx.drawImage(o.img, Math.round(o.x + Math.sin(G.t * 2 + o.x * 0.1)), Math.round(o.y));
    else ctx.drawImage(o.img, Math.round(o.x), Math.round(o.y));
  }
  for (const o of m.objects) if (o.anim === 'fountain' && Math.abs(o.x - G.player.x) < 400) {
    ctx.fillStyle = 'rgba(200,230,255,0.85)';
    for (let i = 0; i < 6; i++) { const a = (G.t * 3 + i * 0.17) % 1; ctx.fillRect(o.x + 24 + Math.cos(i) * 8 * a, o.y + 8 + a * a * 14 - a * 6, 1, 2); }
  }
  for (const f of G.fx) {
    if (f.kind === 'smoke') { ctx.globalAlpha = 0.5 * (1 - f.t / f.life); ctx.drawImage(ART.prop('chimneysmoke'), f.x + Math.sin(f.t * 2) * 3, f.y); ctx.globalAlpha = 1; }
    if (f.kind === 'fly') { ctx.fillStyle = `rgba(255,240,120,${0.8 * Math.sin(Math.PI * f.t / f.life)})`; ctx.fillRect(f.x, f.y, 1.5, 1.5); }
    if (f.kind === 'rain') { ctx.fillStyle = 'rgba(180,200,230,0.55)'; ctx.fillRect(f.x, f.y, 1, 5); }
  }
  for (const b of G.birds) ctx.drawImage(ART.prop('bird'), Math.round(b.x), Math.round(b.y + Math.sin(b.t * 8) * 1.5));
  for (const n of G.npcs) {
    if (!n.pid || !G.npcMark(n.pid)) continue;
    const by = n.y - 42 + Math.sin(G.t * 3) * 1.5;
    ctx.fillStyle = '#2b1d1a'; ctx.fillRect(n.x - 2, by - 1, 5, 9);
    ctx.fillStyle = '#ffd25a'; ctx.fillRect(n.x - 1, by, 3, 5); ctx.fillRect(n.x - 1, by + 6, 3, 1);
  }
  const tgt = G.findTarget();
  if (tgt && !UI.busy()) {
    const bx = Math.round(tgt.px) - 6, by = Math.round(tgt.py) - 8 + Math.round(Math.sin(G.t * 5));
    ctx.fillStyle = '#2b1d1a'; ctx.fillRect(bx - 1, by - 1, 14, 12);
    ctx.fillStyle = '#f7ead0'; ctx.fillRect(bx, by, 12, 10);
    ctx.fillStyle = '#2b1d1a'; ctx.font = 'bold 8px monospace'; ctx.fillText('E', bx + 3.5, by + 8);
  }
  ctx.restore();
  G.renderLight();
  if (m.kind === 'town') {
    ctx.save();
    ctx.font = `${Math.round(5.5 * S)}px "Pixelify Sans", monospace`;
    ctx.textAlign = 'center';
    const active = new Set(Object.values(G.state.scenes).filter((s) => !s.closed).map((s) => s.place));
    for (const b of WORLD.BUILDINGS) {
      const dx = (b.door.x + 0.5) * TS - G.player.x, dy = (b.door.y + 1) * TS - G.player.y;
      if (dx * dx + dy * dy > (TS * 4.5) ** 2) continue;
      const sx = ((b.door.x + 0.5) * TS - cx) * S, sy = ((b.door.y - 2.6) * TS - cy) * S;
      const own = b.house ? POP.people.find((p) => p.home === b.id) : null;
      const label = (b.house && own ? `${own.last} ailesi • ` : '') + G.place(b.id).name + (active.has(b.id) ? ' 🚨' : '');
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
  if (G.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, G.fade)})`; ctx.fillRect(0, 0, G.canvas.width, G.canvas.height); }
};

G.npcMark = function (pid) {
  const c = G.activeCase();
  if (c) {
    if (c.k.sus[pid] && !c.k.sus[pid].read) return true;
    if (c.witness.pid === pid && !c.k.witness) return true;
  }
  for (const sc of Object.values(G.state.scenes)) if (!sc.closed) for (const w of sc.witnesses) if (w.pid === pid && !w.heard) return true;
  return false;
};

G.darkness = function () {
  const h = G.state.time / 60;
  let a = 0;
  if (h >= 17.5) a = h < 21 ? ((h - 17.5) / 3.5) * 0.64 : 0.64;
  if (G.state.weather === 'rain') a = Math.max(a, 0.22);
  return a;
};

G.renderLight = function () {
  let a = G.darkness();
  if (G.map.kind !== 'town') a *= 0.3;
  if (G.map.secretOf) a = Math.max(a, 0.5);
  if (a <= 0.01) return;
  const L = G.lightG, S = G.S;
  const W = G.lightC.width, H = G.lightC.height;
  L.globalCompositeOperation = 'source-over';
  L.clearRect(0, 0, W, H);
  L.fillStyle = G.state.weather === 'rain' && G.darkness() < 0.3 ? `rgba(40,50,70,${a})` : `rgba(14,18,52,${a})`;
  L.fillRect(0, 0, W, H);
  L.globalCompositeOperation = 'destination-out';
  const night = G.state.time / 60 >= 18;
  const lights = night ? G.map.lights.slice() : [];
  lights.push({ x: G.player.x, y: G.player.y - 12, r: G.map.secretOf ? 50 : 36 });
  if (G.map.secretOf) lights.push({ x: G.map.w * TS / 2, y: 3 * TS, r: 70 });
  for (const l of lights) {
    let lx = l.x, ly = l.y, r = l.r;
    if (l.beacon) { lx += Math.cos(G.t * 0.8) * 120; ly += Math.sin(G.t * 0.8) * 40; r = 70; }
    const sx = (lx - G.cam.x) * S, sy = (ly - G.cam.y) * S, rr = r * S;
    if (sx < -rr || sy < -rr || sx > W + rr || sy > H + rr) continue;
    const g = L.createRadialGradient(sx, sy, 0, sx, sy, rr);
    g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    L.fillStyle = g; L.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
  }
  G.ctx.drawImage(G.lightC, 0, 0);
  if (G.map.kind === 'town' && night) {
    G.ctx.save();
    G.ctx.globalCompositeOperation = 'lighter';
    for (const l of G.map.lights) {
      if (l.beacon) continue;
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
  UI.setHud('h-day', `Gün ${st.day} • ${G.dayName()}${st.weather === 'rain' ? ' • yağmur' : ''}`);
  UI.setHud('h-time', U.fmt(Math.floor(st.time / 10) * 10));
  UI.setHud('h-money', '$' + st.money);
  UI.setHud('h-focus', Math.round((st.focus / st.maxFocus) * 100) + '%', 'width');
  UI.setHud('h-focus-txt', `${Math.round(st.focus)}/${st.maxFocus}`);
  const c = G.curCase();
  UI.setHud('hc-title', c && c.status !== 'closed' ? `Dava #${c.num}: ${c.title}` : 'Açık dava yok');
  const nt = TALK.nextTask();
  UI.setHud('hc-task', nt ? `▸ ${nt.t} (${nt.where})` : '');
  UI.setHud('hc-dead', c && c.status === 'active' ? `Süre: ${DATA.DAYS[(c.deadline - 1) % 7]} gece yarısı (Gün ${c.deadline})` : '');
  const s = st.story;
  const extra = [];
  if (st.serial && st.serial.status === 'active' && st.serial.kills) extra.push(`☠ ${st.serial.name}: ${st.serial.kills} kurban`);
  if (s.ch >= 2) extra.push(`Ağ: ${Object.keys(s.exposed).length}/${Object.keys(s.members).length} ifşa`);
  UI.setHud('hc-extra', extra.join('  •  '));
  const sus = document.getElementById('h-sus-row');
  if (s.ch >= 3 && !s.done) { sus.classList.remove('hidden'); UI.setHud('h-sus', s.suspicion + '%', 'width'); UI.setHud('h-sus-txt', s.suspicion + '/100'); }
  else sus.classList.add('hidden');
};

// ============================================================ Etkileşim
G.frontPoint = function (dist) {
  const p = G.player;
  const d = [[0, 1], [0, -1], [-1, 0], [1, 0]][p.dir];
  return [p.x + d[0] * dist, p.y - 4 + d[1] * dist, d];
};

G.findTarget = function () {
  if (!G.map) return null;
  const p = G.player;
  const [fx, fy, d] = G.frontPoint(12);
  let best = null, bd = 13;
  for (const n of G.npcs) {
    const dist = Math.hypot(n.x - fx, n.y - 4 - fy);
    if (dist < bd) { bd = dist; best = n; }
  }
  if (best) return { kind: 'npc', npc: best, px: best.x, py: best.y - 40 };
  const ftx = Math.floor(fx / TS), fty = Math.floor(fy / TS);
  const ptx = Math.floor(p.x / TS), pty = Math.floor((p.y - 3) / TS);
  if (G.map.reach && G.map.reach[fty * G.map.w + ftx]) {
    const bx = ftx + d[0], by = fty + d[1];
    const n = G.npcs.find((nn) => Math.floor(nn.x / TS) === bx && Math.floor((nn.y - 3) / TS) === by);
    if (n) return { kind: 'npc', npc: n, px: n.x, py: n.y - 40 };
  }
  for (const sc of Object.values(G.state.scenes)) {
    if (sc.map !== G.map.id || sc.closed) continue;
    for (const cl of sc.clues) {
      if (sc.found[cl.id] || (cl.hidden && !G.revealed)) continue;
      if ((cl.x === ftx && cl.y === fty) || (cl.x === ptx && cl.y === pty)) return { kind: 'clue', sc, clue: cl, px: cl.x * TS + 8, py: cl.y * TS - 6 };
    }
    const onBody = (x, y) => y === sc.body[1] && (x === sc.body[0] || x === sc.body[0] + 1);
    if (!sc.autopsy && (onBody(ftx, fty) || onBody(ptx, pty))) return { kind: 'body', sc, px: sc.body[0] * TS + 16, py: sc.body[1] * TS - 6 };
    if (sc.safe && sc.safe.x === ftx && sc.safe.y === fty) return { kind: 'safe', sc, px: sc.safe.x * TS + 8, py: sc.safe.y * TS - 12 };
  }
  const act = G.map.acts[ftx + ',' + fty];
  if (act) return { kind: 'act', act, px: ftx * TS + 8, py: fty * TS - 4, tx: ftx, ty: fty };
  return null;
};

G.interact = function () {
  if (UI.busy() || G.scripting) return;
  const t = G.findTarget();
  if (!t) return;
  G.runScript(async () => {
    if (t.kind === 'npc') {
      const n = t.npc;
      n.dir = Math.abs(G.player.x - n.x) > Math.abs(G.player.y - n.y) ? (G.player.x < n.x ? 2 : 3) : (G.player.y < n.y ? 1 : 0);
      if (n.wander) { n.wander.tx = null; n.wander.t = 5; n.moving = false; }
      await TALK.talk(n);
    } else if (t.kind === 'clue') await TALK.pickClue(t.sc, t.clue);
    else if (t.kind === 'body') await TALK.searchBody(t.sc);
    else if (t.kind === 'safe') await TALK.openSafe(t.sc);
    else if (t.kind === 'act') await TALK.useAct(t.act, t);
  });
};

G.observe = function () {
  if (UI.busy() || G.scripting) return;
  const st = G.state;
  const hiddenScene = Object.values(st.scenes).some((sc) => sc.map === G.map.id && !sc.closed && sc.clues.some((cl) => cl.hidden && !sc.found[cl.id]));
  const secret = G.map.kind === 'interior' && st.secrets[G.map.id];
  if (G.revealed) { UI.toast('Gözlem zaten açık. Mor parıltılara bak.'); return; }
  if (hiddenScene || G.map.kind === 'interior') {
    if (!G.useFocus(10)) return;
    G.revealed = true; G.observeFx = 1.2; SFX.focus();
    if (hiddenScene || secret) UI.toast('Gözlem: gizli ayrıntılar parıldıyor! (−10 odak)', 'good');
    else UI.toast('Jade odayı dikkatle süzüyor... Burada saklı bir şey yok. (−10 odak)');
    return;
  }
  G.observeFx = 0.6;
  UI.toast('Jade etrafı süzüyor: “' + DATA.JADE_QUIPS[Math.floor(Math.random() * DATA.JADE_QUIPS.length)] + '”');
};

// ============================================================ Gün geçişi
G.newDay = async function (fainted) {
  const st = G.state;
  st.day += 1;
  st.time = 8 * 60;
  st.tea = 0;
  st.focus = fainted ? Math.round(st.maxFocus * 0.6) : st.maxFocus;
  st.weather = U.hrand(st.seed, st.day, 'w') < 0.22 ? 'rain' : 'clear';
  if (fainted) st.money = Math.max(0, st.money - 15);
  const sp = WORLD.INTERIORS.station.spawn;
  // Jade karakolda uyuduysa o saatler mazeret günlüğüne yazılır
  if (!fainted) {
    const startAbs = (st.day - 2) * 1440 + (G.lastSleepAt || 22 * 60);
    for (let a = startAbs; a < (st.day - 2) * 1440 + 26 * 60; a += 30) st.jlog[Math.floor(a / 30)] = 'station';
  }
  UI.dlg = null; UI.renderDlg();
  const news = [];
  STORY.night(st, news);
  const s = st.story;
  let arrested = false;
  if (s.ch >= 3 && s.suspicion >= 100 && !s.done) {
    arrested = true;
    s.arrests += 1;
    st.day += 1;
    s.suspicion = 55;
    st.rep = Math.max(0, st.rep - 3);
    st.money = Math.max(0, st.money - 40);
  }
  G.enterMap('station', sp[0], sp[1], 0);
  G.fade = 1.5;
  await UI.say(null, fainted
    ? `Jade gece yorgunluktan bayıldı. Ray onu karakoldaki kanepeye taşıdı (−$15). Gün ${st.day} • ${G.dayName()}.`
    : `Jade kanepesinde derin bir uykuya dalıyor... Gün ${st.day} • ${G.dayName()}, sabah 08.00.${st.weather === 'rain' ? ' Dışarıda yağmur var.' : ''}`);
  if (arrested) {
    await UI.interlude([['Yellow Bea', 'Aslan', 'Lion Lion. Danışman hücrede. Söylemiştim.'], ['Aslan', 'Yellow Bea', 'Lion Lion. Bir gün. Avukatları onu yarın çıkarır. Yeterince zaman kazandık.']]);
    await UI.say(G.cast('boss'), 'Jade... Seni bir gün nezarethanede tuttular. FBI İç İşler elindeki delillerle seni suçladı. Kefaletini ben ödedim (−$40, İtibar −3). Biri seni çok profesyonelce tuzağa düşürüyor. Adını temize çıkar!');
  }
  const c = G.curCase();
  if (c && c.status === 'active' && st.day > c.deadline) {
    c.status = 'closed';
    st.failed += 1; st.rep = Math.max(0, st.rep - 2);
    const C = POP.get(c.culprit);
    st.history.push({ num: c.num, title: c.title, stars: 0, result: 'Zaman aşımı', culprit: C.name, day: st.day });
    G.closeScene(c.sceneId);
    SFX.bad();
    await UI.say(G.cast('boss'), `${c.title} dosyası başsavcılığa gitti; süremiz doldu. (İtibar −2) Sonradan anlaşıldı ki katil ${C.name} idi.`);
  }
  for (const n of news) {
    const sc = n.scene && st.scenes[n.scene];
    if (n.kind === 'serial') {
      const v = POP.get(sc.victim);
      SFX.bad();
      await UI.say(G.cast('boss'), `Jade, kötü haber. ${st.serial.name} yine vurdu. Kurban: ${v.name} (${v.job}). Yer: ${G.place(sc.place).name}. Bu ${st.serial.kills}. kurban.`);
      G.addEvidence('serial', 'sk_' + sc.id, `${st.serial.kills}. kurban: ${v.name}`, `${v.name} (${v.age}, ${v.job}) — ${G.place(sc.place).name}. Ölüm gece ${U.hm(sc.tod % 24)} civarı.`, true);
      if (st.serial.kills === 2) G.addEvidence('serial', 'sk_pattern', 'Kurbanlar arasındaki ortak nokta', st.serial.pattern.text);
      if (s.ch >= 2 && U.hrand(st.seed, st.day, 'il') < 0.6) { const ags = STORY.agents(); const a = ags[st.day % ags.length]; await STORY.interlude('body', { A: STORY.codeOf(a), B: STORY.codeOf(s.members[a].boss) }); }
    }
    if (n.kind === 'serialEscaped') {
      st.failed += 1; st.rep = Math.max(0, st.rep - 4);
      const K = POP.get(st.serial.killer); K.gone = true; G.popState(K.id).gone = true;
      await UI.say(G.cast('boss'), `${st.serial.name} altıncı kurbandan sonra kasabadan kayboldu. (İtibar −4) Dosyalara göre katil ${K.name} idi.`);
    }
    if (n.kind === 'frame') {
      const v = POP.get(sc.victim);
      const fr = s.frames[s.frames.length - 1];
      const fdef = DATA.FRAMES.find((f) => f.id === fr.fdef);
      SFX.bad();
      if (!s.seen.frame) await STORY.interlude('frame', { B: STORY.codeOf(s.members[fr.agent].boss) });
      await UI.say(G.cast('boss'), `Jade... ${v.name} dün gece öldürüldü: ${G.place(sc.place).name}. Olay yerinde seni gösteren bir şey var: ${fdef.title.toLowerCase()}. FBI İç İşler seni sorgulamak istiyor. (Şüphe: ${s.suspicion}/100)`);
      await UI.say(G.cast('jade'), `Ölüm saati ${U.hm(fr.tod % 24)} civarı. O saatte beni gören birini bulmalıyım. Ya da bu sahte delili çürütmeliyim.`);
      G.addEvidence('frame', 'fr_' + fr.id, 'Tuzak: ' + v.name, `${fdef.text} Ölüm saati: Gün ${fr.day}, ${U.hm(fr.tod % 24)}. Mazeret için o saatte seni gören birine sor ya da delili delil panosunda analiz et.`);
    }
  }
  if (!G.activeCase() && !(G.curCase() && G.curCase().status === 'pending')) {
    const agentNext = s.ch === 1 && st.solved >= 1 && !s.codeKnown;
    const ag2 = s.ch >= 3 && !s.flags.net2 && STORY.agents().find((a) => !s.exposed[a] && CASES.eligible(POP.get(a)));
    if (agentNext) G.newStandardCase({ agent: STORY.agents()[0] });
    else if (ag2 && U.hrand(st.seed, st.day, 'n2') < 0.5) { G.newStandardCase({ agent: ag2 }); s.flags.net2 = true; }
    else G.newStandardCase();
    if (G.curCase() && G.curCase().status === 'pending') await UI.say(G.cast('boss'), 'Bir de masamda yeni bir dosya var. Ofisime gel.');
  }
  G.npcs = G.npcsFor(G.map.id);
  G.save();
};

G.closeScene = function (id) { const sc = G.state.scenes[id]; if (sc) sc.closed = true; };

window.addEventListener('load', G.init);
